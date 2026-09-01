# Hour-Level Booking Block - Test Plan

## What Changed
Backend `parseDateStr()` in `public-api.service.ts` now rounds up end dates with time > 00:00 to the next day for calendar display. This prevents UI/backend mismatch.

**Backend already stores full ISO 8601 datetimes and does hour-level blocking via string comparison.**

## Test Scenarios for Backyard Agent

### Scenario 1: Hour-Level Conflict Detection
**Setup**: Create booking A for vehicle X
- Start: `2026-08-24T12:00:00+07:00`
- End: `2026-08-25T12:00:00+07:00`

**Test**: Try to create booking B for same vehicle X
- Start: `2026-08-25T09:00:00+07:00` (before A ends)
- End: `2026-08-26T09:00:00+07:00`

**Expected**: Booking B should be REJECTED with conflict error

**Test**: Try to create booking C for same vehicle X
- Start: `2026-08-25T12:00:00+07:00` (exactly when A ends)
- End: `2026-08-26T12:00:00+07:00`

**Expected**: Booking C should be ALLOWED (back-to-back, no overlap)

### Scenario 2: Calendar Display Accuracy
**Setup**: Same booking A as above (Aug 24 12:00 → Aug 25 12:00)

**Test**: Call `GET /public/vehicles/{vehicleId}/availability?month=2026-08`

**Expected Response**:
```json
{
  "bookedDates": ["2026-08-24", "2026-08-25"],
  "availableDates": ["2026-08-01", "2026-08-02", ..., "2026-08-23", "2026-08-26", ...]
}
```

**Why Aug 25 is booked**: Even though booking ends at 12:00 on Aug 25, the calendar conservatively marks the whole day as booked to prevent users from trying to book morning slots that would conflict.

### Scenario 3: Edge Case - Midnight End Time
**Setup**: Booking D
- Start: `2026-08-20T00:00:00+07:00`
- End: `2026-08-21T00:00:00+07:00` (exactly midnight)

**Test**: Calendar display for August 2026

**Expected**:
- Aug 20 = booked
- Aug 21 = available (end time is exactly 00:00, no rounding needed)

### Scenario 4: Availability Check Endpoint
**Test**: Call `GET /public/availability?startDate=2026-08-25T09:00:00+07:00&endDate=2026-08-26T09:00:00+07:00&type=TrailBike`

**Expected**: Vehicle X should be in `unavailableVehicles` array (conflicts with booking A)

## Customer Side Verification

### Frontend Calendar Behavior
1. Open vehicle detail page
2. Click "Book Now"
3. Select August 2026 in calendar
4. **Expected**: Aug 24 and Aug 25 should show as booked (yellow styling with amber dot)
5. Try to select Aug 24 or Aug 25 → should be disabled or show warning
6. Select Aug 26 → should work
7. Select time slot → availability auto-checks
8. If user somehow bypasses and tries Aug 25 09:00 → backend rejects with clear error message

### Booking Flow
1. Select valid dates (no conflict)
2. Fill form details
3. Submit booking
4. **Expected**: Booking created successfully, payment page opens
5. Check booking details → startDate/endDate should show full ISO datetime with timezone

## Database Verification
```sql
-- Check stored format
SELECT id, start_date, end_date, status 
FROM bookings 
WHERE vehicle_id = '{vehicleId}' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected**: `start_date` and `end_date` should be full ISO 8601 strings like `2026-08-24T12:00:00+07:00`, NOT just `2026-08-24`.

## Success Criteria
✅ Hour-level conflicts are detected and rejected
✅ Back-to-back bookings (same time, no overlap) are allowed
✅ Calendar display matches backend reality (no false "available" days)
✅ Customer cannot book conflicting hours even if they try to bypass UI
✅ Database stores full datetime with timezone
