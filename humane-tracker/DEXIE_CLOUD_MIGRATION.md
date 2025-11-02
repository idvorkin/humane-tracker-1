# Migration from Firebase to Dexie Cloud

This document explains the migration from Firebase to Dexie Cloud and how to set up your Dexie Cloud database.

## What Changed

### Removed
- Firebase SDK (`firebase`, `react-firebase-hooks`)
- Firebase Authentication (Google OAuth)
- Firebase Firestore database
- `src/config/firebase.ts`

### Added
- Dexie.js (`dexie`) - IndexedDB wrapper
- Dexie Cloud Addon (`dexie-cloud-addon`) - Cloud sync
- Dexie React Hooks (`dexie-react-hooks`) - React integration
- `src/config/db.ts` - Dexie database configuration

## Benefits of Dexie Cloud

1. **Local-First Architecture**: Data is stored locally in IndexedDB and synced to the cloud
2. **Offline Support**: Works offline with automatic sync when back online
3. **Real-time Sync**: Changes sync across devices in real-time
4. **Built-in Authentication**: Multiple auth providers supported
5. **Cost-Effective**: Generally cheaper than Firebase for many use cases
6. **Privacy-Focused**: Data is stored locally first

## Setup Instructions

### 1. Create a Dexie Cloud Database

1. Go to [https://dexie.cloud](https://dexie.cloud)
2. Sign in or create an account
3. Click "Create Database"
4. Choose a name for your database
5. Copy the database URL (format: `https://your-db-name.dexie.cloud`)

### 2. Configure Your Environment

Update the `.env` file with your Dexie Cloud database URL:

```env
REACT_APP_DEXIE_CLOUD_URL=https://your-db-name.dexie.cloud
```

### 3. Configure Access Control (Optional)

In the Dexie Cloud dashboard, you can configure:
- **Authentication providers** (email/password, OAuth providers)
- **Access control rules** for your tables
- **Permissions** for read/write operations

By default, Dexie Cloud requires authentication and users can only access their own data.

### 4. Data Schema

The application uses two main tables:

**habits**
- `id` (auto-generated)
- `userId` (user identifier)
- `name` (habit name)
- `category` (habit category)
- `targetPerWeek` (weekly goal)
- `trackingType` (binary/sets/hybrid)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

**entries**
- `id` (auto-generated)
- `habitId` (references habits)
- `userId` (user identifier)
- `date` (entry date)
- `value` (entry value)
- `notes` (optional notes)
- `createdAt` (timestamp)

### 5. Migrating Data from Firebase (Optional)

If you have existing Firebase data, you can export it and import to Dexie Cloud:

1. Export data from Firebase Firestore
2. Create a migration script to import data using Dexie's API:

```typescript
import { db } from './config/db';

async function migrateData(firebaseData) {
  // Import habits
  await db.habits.bulkAdd(firebaseData.habits);

  // Import entries
  await db.entries.bulkAdd(firebaseData.entries);
}
```

## Key Differences in Code

### Authentication

**Firebase:**
```typescript
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
const provider = new GoogleAuthProvider();
await signInWithPopup(auth, provider);
```

**Dexie Cloud:**
```typescript
import { db } from './config/db';
await db.cloud.login(); // Opens built-in login UI
```

### Querying Data

**Firebase:**
```typescript
const q = query(collection(db, 'habits'), where('userId', '==', userId));
const snapshot = await getDocs(q);
```

**Dexie Cloud:**
```typescript
const habits = await db.habits
  .where('userId')
  .equals(userId)
  .toArray();
```

### Real-time Subscriptions

**Firebase:**
```typescript
onSnapshot(q, (snapshot) => {
  // handle updates
});
```

**Dexie Cloud:**
```typescript
const observable = liveQuery(() =>
  db.habits.where('userId').equals(userId).toArray()
);
observable.subscribe(habits => {
  // handle updates
});
```

## Development

Start the development server:

```bash
npm start
```

The application will run on `http://localhost:3000` (or configured HOST:PORT).

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy the `build` folder to your hosting service
3. Ensure the `REACT_APP_DEXIE_CLOUD_URL` environment variable is set

## Troubleshooting

### Authentication Issues
- Ensure your Dexie Cloud database URL is correct
- Check that `requireAuth: true` is set in `src/config/db.ts`
- Verify authentication providers are configured in Dexie Cloud dashboard

### Sync Issues
- Check browser console for errors
- Verify internet connection
- Ensure Dexie Cloud service is running

### Data Not Appearing
- Data is stored locally first, so check IndexedDB in browser DevTools
- Verify `userId` is correctly set on all records
- Check Dexie Cloud dashboard for sync status

## Resources

- [Dexie.js Documentation](https://dexie.org)
- [Dexie Cloud Documentation](https://dexie.org/cloud/)
- [Dexie React Hooks](https://github.com/dexie/Dexie.js/tree/master/libs/dexie-react-hooks)

## Support

For issues with:
- **Dexie Cloud**: Visit [Dexie Cloud Support](https://dexie.org/cloud/docs/support)
- **This Application**: Check the repository issues or create a new issue
