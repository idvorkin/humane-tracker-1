#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "textual>=0.89.0",
#     "rich>=13.9.0",
#     "pytest>=8.0.0",
#     "pytest-asyncio>=0.24.0",
# ]
# ///
"""Tests for Humane Tracker TUI using Textual's testing framework."""

import pytest
from textual.widgets import DataTable

from humane_cli import (
    CategoriesScreen,
    EntriesScreen,
    HabitsScreen,
    HelpScreen,
    HumaneCLI,
    HumaneData,
)

# Test data fixture
TEST_DATA = {
    "version": 1,
    "habits": [
        {
            "id": "habit1",
            "name": "Morning Run",
            "category": "fitness",
            "targetPerWeek": 3,
        },
        {
            "id": "habit2",
            "name": "Meditation",
            "category": "wellness",
            "targetPerWeek": 7,
        },
        {
            "id": "habit3",
            "name": "Evening Walk",
            "category": "fitness",
            "targetPerWeek": 5,
        },
    ],
    "entries": [
        {"id": "e1", "habitId": "habit1", "date": "2025-11-28", "value": 1, "createdAt": "2025-11-28T10:00:00Z"},
        {"id": "e2", "habitId": "habit1", "date": "2025-11-27", "value": 1, "createdAt": "2025-11-27T10:00:00Z"},
        {"id": "e3", "habitId": "habit2", "date": "2025-11-28", "value": 1, "createdAt": "2025-11-28T08:00:00Z"},
    ],
}


@pytest.fixture
def humane_data():
    """Create test HumaneData instance."""
    return HumaneData(data=TEST_DATA)


@pytest.fixture
def app(humane_data):
    """Create test app instance."""
    return HumaneCLI(humane_data=humane_data)


class TestHumaneData:
    """Tests for HumaneData class."""

    def test_get_categories(self, humane_data):
        categories = humane_data.get_categories()
        assert "fitness" in categories
        assert "wellness" in categories
        assert len(categories["fitness"]) == 2
        assert len(categories["wellness"]) == 1

    def test_get_habits_by_category(self, humane_data):
        fitness_habits = humane_data.get_habits_by_category("fitness")
        assert len(fitness_habits) == 2
        names = [h["name"] for h in fitness_habits]
        assert "Morning Run" in names
        assert "Evening Walk" in names

    def test_get_entries_for_habit(self, humane_data):
        entries = humane_data.get_entries_for_habit("habit1")
        assert len(entries) == 2

        entries = humane_data.get_entries_for_habit("habit2")
        assert len(entries) == 1

    def test_get_habit_name(self, humane_data):
        assert humane_data.get_habit_name("habit1") == "Morning Run"
        assert humane_data.get_habit_name("nonexistent") == "Unknown"

    def test_get_category_stats(self, humane_data):
        stats = humane_data.get_category_stats()
        # Should be sorted by category name
        assert stats[0] == ("fitness", 2, 8)  # 3 + 5 = 8
        assert stats[1] == ("wellness", 1, 7)


class TestCategoriesScreen:
    """Tests for CategoriesScreen."""

    @pytest.mark.asyncio
    async def test_categories_display(self, app):
        async with app.run_test() as pilot:
            # Should start on categories screen
            assert isinstance(app.screen, CategoriesScreen)

            # Check table has correct rows - query from screen
            table = app.screen.query_one("#categories-table", DataTable)
            assert table.row_count == 2  # fitness and wellness

    @pytest.mark.asyncio
    async def test_navigate_with_j_k(self, app):
        async with app.run_test() as pilot:
            table = app.screen.query_one("#categories-table", DataTable)

            # Should start at row 0
            assert table.cursor_row == 0

            # Press j to go down
            await pilot.press("j")
            assert table.cursor_row == 1

            # Press k to go back up
            await pilot.press("k")
            assert table.cursor_row == 0

    @pytest.mark.asyncio
    async def test_select_with_enter(self, app):
        async with app.run_test() as pilot:
            # Press enter to select first category (fitness)
            await pilot.press("enter")

            # Should now be on habits screen
            assert isinstance(app.screen, HabitsScreen)
            assert app.screen.category == "fitness"

    @pytest.mark.asyncio
    async def test_select_with_l(self, app):
        async with app.run_test() as pilot:
            # Press l to select (vim right = enter)
            await pilot.press("l")

            assert isinstance(app.screen, HabitsScreen)

    @pytest.mark.asyncio
    async def test_help_screen(self, app):
        async with app.run_test() as pilot:
            await pilot.press("?")
            assert isinstance(app.screen, HelpScreen)

            # Escape should go back
            await pilot.press("escape")
            assert isinstance(app.screen, CategoriesScreen)


class TestHabitsScreen:
    """Tests for HabitsScreen."""

    @pytest.mark.asyncio
    async def test_habits_display(self, app):
        async with app.run_test() as pilot:
            # Navigate to fitness habits
            await pilot.press("enter")

            assert isinstance(app.screen, HabitsScreen)
            table = app.screen.query_one("#habits-table", DataTable)
            assert table.row_count == 2  # Morning Run and Evening Walk

    @pytest.mark.asyncio
    async def test_back_with_h(self, app):
        async with app.run_test() as pilot:
            await pilot.press("enter")  # Go to habits
            assert isinstance(app.screen, HabitsScreen)

            await pilot.press("h")  # Go back
            assert isinstance(app.screen, CategoriesScreen)

    @pytest.mark.asyncio
    async def test_back_with_escape(self, app):
        async with app.run_test() as pilot:
            await pilot.press("enter")
            assert isinstance(app.screen, HabitsScreen)

            await pilot.press("escape")
            assert isinstance(app.screen, CategoriesScreen)

    @pytest.mark.asyncio
    async def test_navigate_to_entries(self, app):
        async with app.run_test() as pilot:
            await pilot.press("enter")  # Go to habits
            await pilot.press("enter")  # Go to entries

            assert isinstance(app.screen, EntriesScreen)


class TestEntriesScreen:
    """Tests for EntriesScreen."""

    @pytest.mark.asyncio
    async def test_entries_display(self, app):
        async with app.run_test() as pilot:
            # Navigate to fitness -> first habit (Evening Walk, alphabetically)
            await pilot.press("enter")
            await pilot.press("enter")

            assert isinstance(app.screen, EntriesScreen)
            table = app.screen.query_one("#entries-table", DataTable)
            # Evening Walk has no entries, so should show "No entries" row
            assert table.row_count >= 1

    @pytest.mark.asyncio
    async def test_back_navigation(self, app):
        async with app.run_test() as pilot:
            await pilot.press("enter")  # Categories -> Habits
            await pilot.press("enter")  # Habits -> Entries

            assert isinstance(app.screen, EntriesScreen)

            await pilot.press("h")  # Back to habits
            assert isinstance(app.screen, HabitsScreen)

            await pilot.press("h")  # Back to categories
            assert isinstance(app.screen, CategoriesScreen)

    @pytest.mark.asyncio
    async def test_full_navigation_flow(self, app):
        """Test navigating categories -> habits -> entries -> back -> back."""
        async with app.run_test() as pilot:
            # Start at categories
            assert isinstance(app.screen, CategoriesScreen)

            # Go to habits (press j to go to wellness, then enter)
            await pilot.press("j")  # Move to wellness
            await pilot.press("l")  # Select with l

            assert isinstance(app.screen, HabitsScreen)
            assert app.screen.category == "wellness"

            # Go to entries
            await pilot.press("enter")
            assert isinstance(app.screen, EntriesScreen)
            assert app.screen.habit_name == "Meditation"

            # Navigate all the way back
            await pilot.press("escape")
            assert isinstance(app.screen, HabitsScreen)

            await pilot.press("escape")
            assert isinstance(app.screen, CategoriesScreen)


class TestQuit:
    """Tests for quit functionality."""

    @pytest.mark.asyncio
    async def test_quit_from_categories(self, app):
        async with app.run_test() as pilot:
            await pilot.press("q")
            # App should exit (no assertion needed, just shouldn't hang)

    @pytest.mark.asyncio
    async def test_quit_from_habits(self, app):
        async with app.run_test() as pilot:
            await pilot.press("enter")  # Go to habits
            await pilot.press("q")
            # App should exit


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
