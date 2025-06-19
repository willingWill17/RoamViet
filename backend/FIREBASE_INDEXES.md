# Firebase Indexes for Schedule Sharing System

This document outlines the Firebase/Firestore indexes required for the schedule sharing functionality.

## Collection Structure

### `schedules` Collection

Each schedule document contains:

```json
{
  "id": "document_id",
  "user_id": "owner_user_id",
  "title": "Schedule Title",
  "description": "Schedule Description",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-01-07T00:00:00Z",
  "total_days": 7,
  "budget": 1000.0,
  "currency": "VND",
  "is_public": false,
  "shared_with_emails": ["user1@example.com", "user2@example.com"],
  "shared_with_user_ids": ["user_id_1", "user_id_2"],
  "tags": ["vacation", "beach"],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### `users` Collection

Each user document contains:

```json
{
  "id": "user_id",
  "name": "User Name",
  "email": "user@example.com",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

## Required Indexes

### Automatic Single-Field Indexes

Firestore automatically creates single-field indexes for:

- `schedules.user_id` (for querying user's own schedules)
- `schedules.shared_with_user_ids` (for array-contains queries)
- `schedules.is_public` (for public schedule queries)
- `users.email` (for user search by email)

### Queries Used in the System

1. **Get User's Own Schedules**

   ```javascript
   db.collection("schedules").where("user_id", "==", user_id);
   ```

   Uses: Single-field index on `user_id` (automatic)

2. **Get Schedules Shared with User**

   ```javascript
   db.collection("schedules").where(
     "shared_with_user_ids",
     "array_contains",
     user_id
   );
   ```

   Uses: Single-field index on `shared_with_user_ids` (automatic)

3. **Find User by Email**

   ```javascript
   db.collection("users").where("email", "==", email);
   ```

   Uses: Single-field index on `email` (automatic)

4. **Search Users by Email (partial match)**
   ```javascript
   // Note: This requires client-side filtering as Firestore doesn't support LIKE queries
   db.collection("users").limit(100);
   // Then filter in application code
   ```

### Composite Indexes (if needed)

Currently, the system doesn't require composite indexes as we're not combining multiple field filters or ordering by different fields in the same query.

If you need more complex queries in the future, you might need composite indexes like:

- `schedules`: `user_id` + `created_at` (for ordered user schedules)
- `schedules`: `is_public` + `created_at` (for ordered public schedules)

## Index Management

### Automatic Index Creation

Firestore will automatically create single-field indexes when:

1. You first run a query that requires an index
2. The field is used in a `where()`, `orderBy()`, or `array_contains()` clause

### Manual Index Creation (if needed)

If you need to create composite indexes manually:

1. **Via Firebase Console:**

   - Go to Firestore Database
   - Click on "Indexes" tab
   - Click "Create Index"
   - Select collection and fields

2. **Via Firebase CLI:**
   ```bash
   firebase deploy --only firestore:indexes
   ```

### Monitoring Index Usage

You can monitor index performance in the Firebase Console under:

- Firestore Database → Usage tab
- Shows query performance and index efficiency

## Security Rules

Make sure your Firestore security rules allow the sharing functionality:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own schedules
    match /schedules/{scheduleId} {
      allow read, write: if request.auth != null &&
        request.auth.uid == resource.data.user_id;

      // Users can read schedules shared with them
      allow read: if request.auth != null &&
        (resource.data.is_public == true ||
         request.auth.uid in resource.data.shared_with_user_ids);
    }

    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null &&
        request.auth.uid == userId;
    }
  }
}
```

## Performance Considerations

1. **Sharing Lists**: Keep `shared_with_user_ids` arrays reasonably small (< 100 items)
2. **Email Conversion**: The system converts emails to user IDs for efficient querying
3. **Caching**: Consider caching user email→ID mappings for better performance
4. **Pagination**: Implement pagination for large result sets

## Troubleshooting

### Common Issues:

1. **Index Creation Delay**: New indexes can take a few minutes to become available
2. **Missing Indexes**: Check Firebase Console for any required composite indexes
3. **Array Queries**: `array_contains` only works with exact matches, not partial matches
4. **Case Sensitivity**: Email searches are case-sensitive; emails are stored in lowercase

### Debug Commands:

```bash
# Check index status
firebase firestore:indexes

# Deploy indexes
firebase deploy --only firestore:indexes
```
