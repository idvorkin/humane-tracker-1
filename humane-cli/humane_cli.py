#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "textual>=0.89.0",
#     "rich>=13.9.0",
# ]
# ///
"""Humane Tracker TUI - Explore habit tracker backup data with vi keybindings."""

import json
import sys
from collections import defaultdict
from pathlib import Path

from textual import on
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Container
from textual.screen import Screen
from textual.widgets import DataTable, Footer, Header, Label, Static


class HumaneData:
    """Load and analyze humane tracker backup data."""

    def __init__(self, filepath: str | None = None, data: dict | None = None):
        if data is not None:
            self.data = data
        elif filepath:
            with open(filepath) as f:
                self.data = json.load(f)
        else:
            raise ValueError("Must provide either filepath or data")
        self.habits = {h["id"]: h for h in self.data.get("habits", [])}
        self.entries = self.data.get("entries", [])

    def get_categories(self) -> dict[str, list[dict]]:
        """Group habits by category."""
        categories = defaultdict(list)
        for habit in self.data.get("habits", []):
            categories[habit.get("category", "uncategorized")].append(habit)
        return dict(categories)

    def get_habits_by_category(self, category: str) -> list[dict]:
        """Get all habits in a category."""
        return [h for h in self.data.get("habits", []) if h.get("category") == category]

    def get_entries_for_habit(self, habit_id: str) -> list[dict]:
        """Get all entries for a habit."""
        return [e for e in self.entries if e.get("habitId") == habit_id]

    def get_habit_name(self, habit_id: str) -> str:
        """Get habit name by ID."""
        habit = self.habits.get(habit_id)
        return habit.get("name", "Unknown") if habit else "Unknown"

    def get_category_stats(self) -> list[tuple[str, int, int]]:
        """Get (category, habit_count, total_target) tuples."""
        categories = self.get_categories()
        stats = []
        for cat, habits in sorted(categories.items()):
            total_target = sum(h.get("targetPerWeek", 0) for h in habits)
            stats.append((cat, len(habits), total_target))
        return stats


class CategoriesScreen(Screen):
    """Screen showing all categories."""

    BINDINGS = [
        Binding("j", "cursor_down", "Down", show=False),
        Binding("k", "cursor_up", "Up", show=False),
        Binding("enter", "select", "Select"),
        Binding("l", "select", "Select", show=False),
        Binding("q", "quit", "Quit"),
        Binding("?", "help", "Help"),
    ]

    def __init__(self, humane_data: HumaneData):
        super().__init__()
        self.humane_data = humane_data

    def compose(self) -> ComposeResult:
        yield Header()
        yield Container(
            Label("Categories", classes="title"),
            DataTable(id="categories-table"),
            id="main-container",
        )
        yield Footer()

    def on_mount(self) -> None:
        table = self.query_one("#categories-table", DataTable)
        table.cursor_type = "row"
        table.zebra_stripes = True
        table.add_columns("Category", "Habits", "Weekly Target")

        for cat, count, target in self.humane_data.get_category_stats():
            table.add_row(cat.capitalize(), str(count), str(target), key=cat)

        table.focus()

    def action_cursor_down(self) -> None:
        table = self.query_one("#categories-table", DataTable)
        table.action_cursor_down()

    def action_cursor_up(self) -> None:
        table = self.query_one("#categories-table", DataTable)
        table.action_cursor_up()

    def action_select(self) -> None:
        table = self.query_one("#categories-table", DataTable)
        if table.cursor_row is not None and table.row_count > 0:
            row_key = table.coordinate_to_cell_key((table.cursor_row, 0)).row_key
            category = str(row_key.value)
            self.app.push_screen(HabitsScreen(self.humane_data, category))

    @on(DataTable.RowSelected)
    def on_row_selected(self, event: DataTable.RowSelected) -> None:
        category = str(event.row_key.value)
        self.app.push_screen(HabitsScreen(self.humane_data, category))

    def action_help(self) -> None:
        self.app.push_screen(HelpScreen())


class HabitsScreen(Screen):
    """Screen showing habits in a category."""

    BINDINGS = [
        Binding("j", "cursor_down", "Down", show=False),
        Binding("k", "cursor_up", "Up", show=False),
        Binding("enter", "select", "Select"),
        Binding("l", "select", "Select", show=False),
        Binding("h", "back", "Back"),
        Binding("escape", "back", "Back", show=False),
        Binding("q", "quit", "Quit"),
        Binding("?", "help", "Help"),
    ]

    def __init__(self, humane_data: HumaneData, category: str):
        super().__init__()
        self.humane_data = humane_data
        self.category = category
        self.habits = humane_data.get_habits_by_category(category)

    def compose(self) -> ComposeResult:
        yield Header()
        yield Container(
            Label(f"Habits: {self.category.capitalize()}", classes="title"),
            DataTable(id="habits-table"),
            id="main-container",
        )
        yield Footer()

    def on_mount(self) -> None:
        table = self.query_one("#habits-table", DataTable)
        table.cursor_type = "row"
        table.zebra_stripes = True
        table.add_columns("Name", "Target/Week", "Entries")

        for habit in sorted(self.habits, key=lambda h: h.get("name", "")):
            entry_count = len(self.humane_data.get_entries_for_habit(habit["id"]))
            table.add_row(
                habit.get("name", "Unknown"),
                str(habit.get("targetPerWeek", 0)),
                str(entry_count),
                key=habit["id"],
            )

        table.focus()

    def action_cursor_down(self) -> None:
        table = self.query_one("#habits-table", DataTable)
        table.action_cursor_down()

    def action_cursor_up(self) -> None:
        table = self.query_one("#habits-table", DataTable)
        table.action_cursor_up()

    def action_select(self) -> None:
        table = self.query_one("#habits-table", DataTable)
        if table.cursor_row is not None and table.row_count > 0:
            row_key = table.coordinate_to_cell_key((table.cursor_row, 0)).row_key
            habit_id = str(row_key.value)
            self.app.push_screen(EntriesScreen(self.humane_data, habit_id))

    @on(DataTable.RowSelected)
    def on_row_selected(self, event: DataTable.RowSelected) -> None:
        habit_id = str(event.row_key.value)
        self.app.push_screen(EntriesScreen(self.humane_data, habit_id))

    def action_back(self) -> None:
        self.app.pop_screen()

    def action_help(self) -> None:
        self.app.push_screen(HelpScreen())


class EntriesScreen(Screen):
    """Screen showing entries for a habit."""

    BINDINGS = [
        Binding("j", "cursor_down", "Down", show=False),
        Binding("k", "cursor_up", "Up", show=False),
        Binding("h", "back", "Back"),
        Binding("escape", "back", "Back", show=False),
        Binding("q", "quit", "Quit"),
        Binding("?", "help", "Help"),
        Binding("g", "go_top", "Top", show=False),
        Binding("G", "go_bottom", "Bottom", show=False),
    ]

    def __init__(self, humane_data: HumaneData, habit_id: str):
        super().__init__()
        self.humane_data = humane_data
        self.habit_id = habit_id
        self.habit_name = humane_data.get_habit_name(habit_id)
        self.entries = humane_data.get_entries_for_habit(habit_id)

    def compose(self) -> ComposeResult:
        yield Header()
        yield Container(
            Label(f"Entries: {self.habit_name}", classes="title"),
            DataTable(id="entries-table"),
            id="main-container",
        )
        yield Footer()

    def on_mount(self) -> None:
        table = self.query_one("#entries-table", DataTable)
        table.cursor_type = "row"
        table.zebra_stripes = True
        table.add_columns("Date", "Value", "Created At")

        for entry in sorted(self.entries, key=lambda e: e.get("date", ""), reverse=True):
            date_str = entry.get("date", "")[:10]
            created_str = entry.get("createdAt", "")[:10]
            table.add_row(date_str, str(entry.get("value", 0)), created_str)

        if not self.entries:
            table.add_row("No entries", "-", "-")

        table.focus()

    def action_cursor_down(self) -> None:
        table = self.query_one("#entries-table", DataTable)
        table.action_cursor_down()

    def action_cursor_up(self) -> None:
        table = self.query_one("#entries-table", DataTable)
        table.action_cursor_up()

    def action_back(self) -> None:
        self.app.pop_screen()

    def action_help(self) -> None:
        self.app.push_screen(HelpScreen())

    def action_go_top(self) -> None:
        table = self.query_one("#entries-table", DataTable)
        table.move_cursor(row=0)

    def action_go_bottom(self) -> None:
        table = self.query_one("#entries-table", DataTable)
        table.move_cursor(row=table.row_count - 1)


class HelpScreen(Screen):
    """Help screen showing keybindings."""

    BINDINGS = [
        Binding("escape", "back", "Back"),
        Binding("q", "back", "Back"),
        Binding("?", "back", "Back"),
    ]

    def compose(self) -> ComposeResult:
        yield Header()
        yield Container(
            Label("Keybindings", classes="title"),
            Static(
                """
[bold]Navigation[/bold]
  j / ↓      Move down
  k / ↑      Move up
  g          Go to top
  G          Go to bottom

[bold]Selection[/bold]
  Enter / l  Select / Enter
  h / Esc    Go back

[bold]General[/bold]
  ?          Show this help
  q          Quit

[bold]Screens[/bold]
  Categories → Habits → Entries
  Navigate with h/l or Enter/Esc
""",
                classes="help-text",
            ),
            id="main-container",
        )
        yield Footer()

    def action_back(self) -> None:
        self.app.pop_screen()


class HumaneCLI(App):
    """Humane Tracker TUI Application."""

    CSS = """
    #main-container {
        padding: 1 2;
    }

    .title {
        text-style: bold;
        color: $accent;
        padding-bottom: 1;
    }

    DataTable {
        height: 100%;
    }

    .help-text {
        padding: 1 2;
    }
    """

    TITLE = "Humane Tracker"
    SUB_TITLE = "Habit Backup Explorer"

    BINDINGS = [
        Binding("q", "quit", "Quit"),
    ]

    def __init__(self, filepath: str | None = None, humane_data: HumaneData | None = None):
        super().__init__()
        if humane_data:
            self.humane_data = humane_data
        elif filepath:
            self.humane_data = HumaneData(filepath)
        else:
            raise ValueError("Must provide either filepath or humane_data")

    def on_mount(self) -> None:
        self.push_screen(CategoriesScreen(self.humane_data))


def main():
    """Entry point for the CLI."""
    if len(sys.argv) < 2:
        # Default to looking for backup file in parent directory
        default_path = Path(__file__).parent.parent / "humane-tracker-backup-2025-11-29.json"
        if default_path.exists():
            filepath = str(default_path)
        else:
            print("Usage: humane-cli <backup-file.json>")
            print("       or place humane-tracker-backup-*.json in parent directory")
            sys.exit(1)
    else:
        filepath = sys.argv[1]

    if not Path(filepath).exists():
        print(f"Error: File not found: {filepath}")
        sys.exit(1)

    app = HumaneCLI(filepath)
    app.run()


if __name__ == "__main__":
    main()
