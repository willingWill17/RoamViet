# Enhanced Daily Planning Features

## Overview

The schedule creation system has been enhanced to include detailed daily planning with **custom time phases**, activities, and notes. Users can create their own time phases instead of being limited to fixed periods.

## New Features

### 1. Custom Time-Based Planning

- **Flexible Time Phases**: Create your own time phases (e.g., "Early Morning", "Breakfast", "Sightseeing", "Lunch Break", "Afternoon Tour", "Dinner", "Night Market")
- **Time Ranges**: Optionally specify time ranges for each phase (e.g., "9:00-12:00", "2:30-5:00 PM")
- **Unlimited Phases**: Add as many time phases as needed for each day
- **Phase Management**: Easily add, remove, and rename time phases

### 2. Activity Management

- Add multiple activities per custom time phase
- Each activity includes:
  - Activity name
  - Detailed notes (location, costs, etc.)
- Remove activities with one click
- Expandable/collapsible daily plans

### 3. User Interface

- Interactive daily planning cards
- Real-time updates when dates change
- Custom time phase creation and editing
- Responsive design for all devices

## How to Use

### Creating a Schedule

1. Fill in basic schedule information (title, description, dates, etc.)
2. Select start and end dates to activate daily planning
3. Click on any day card to expand it
4. Create custom time phases:
   - Click "+ Add Time Phase" to create a new phase
   - Enter a name for your time phase (e.g., "Morning Temple Visit", "Lunch Break", "Afternoon Shopping")
   - Optionally add a time range (e.g., "9:00-11:30")
5. Add activities to each time phase:
   - Click "+ Add Activity" within any time phase
   - Enter activity name and detailed notes
6. Save the schedule

### Managing Time Phases

- **Adding Phases**: Click "+ Add Time Phase" for each day
- **Naming Phases**: Enter descriptive names like "Breakfast", "City Tour", "Shopping Time"
- **Time Ranges**: Add optional time ranges like "9:00-12:00" or "2:30-5:00 PM"
- **Removing Phases**: Click "Remove Phase" to delete unwanted time phases
- **Editing**: Click directly in the input fields to modify phase names and times

### Editing Activities

- Click the "×" button to remove an activity
- Click in the activity name field to edit
- Click in the notes area to add/edit details
- Changes are saved automatically when you save the schedule

### Viewing Schedules

- Schedule details show activities organized by your custom time phases
- Each day displays your personalized time phases with their time ranges
- Legacy schedules are automatically converted to show existing activities

## Technical Details

### Data Structure

```javascript
dailyPlans = {
  "2024-01-15": {
    timePhases: [
      {
        name: "Early Morning",
        timeRange: "6:00-9:00",
        activities: [
          { name: "Temple Visit", notes: "Entry fee: $5, Dress modestly" },
        ],
      },
      {
        name: "Brunch & Shopping",
        timeRange: "10:00-14:00",
        activities: [
          { name: "Local Market", notes: "Try street food, Budget: $20" },
          { name: "Souvenir Shopping", notes: "Look for handmade crafts" },
        ],
      },
      {
        name: "Evening Relaxation",
        timeRange: "18:00-22:00",
        activities: [
          { name: "Sunset Viewing", notes: "Best spot: Hill viewpoint" },
        ],
      },
    ],
  },
};
```

### API Integration

- Custom time phases are converted to the existing API format
- Each activity includes both `time_phase` (name) and `time_range` fields
- Backward compatible with existing schedules
- Existing schedules are automatically grouped by time phase when edited

## Limitations

- Maximum 30 days for detailed daily planning (to maintain performance)
- Activities are stored as destinations in the existing API structure
- Time phases are per-day (cannot span multiple days)

## Future Enhancements

- Time phase templates and suggestions
- Drag-and-drop reordering of phases and activities
- Duration tracking for activities
- Budget tracking per activity
- Activity templates based on location
- Collaborative real-time editing
- Export to calendar applications
