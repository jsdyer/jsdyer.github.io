# Atlantic Dial

[Open the programme guide](https://coolcode.ca/atlanticdial/). Find selected local radio shows in Atlantic Canada, see their broadcast times where you live, and open the broadcaster's own player. The first edition covers community interviews, requests, Acadian and Newfoundland music, and Cape Breton fiddle and kitchen-party broadcasts.

<!-- coolcode:guide -->
Choose Vancouver or your device time to see when a show airs where you are. Save a favourite for return visits or download one airing to your calendar, including its station link.
<!-- /coolcode:guide -->

## Try a Saturday

Choose **All week** and **Prince Edward Island** to find CFCY's Saturday Night Hoedown. Choose **St. John's** in the time selector to see what time the Island broadcast starts in Newfoundland. The small time beneath each listing gives the programme's start in its own station zone. Select **All four provinces** to find VOCM's Cabin Party, which continues across midnight. **Add to calendar** exports the particular airing you selected. The station's player opens on the broadcaster's site.

## What the schedule covers

The source file is [schedule.json](schedule.json). It contains the station, community, province, station time zone, direct listening and schedule links, and weekly days and times for each selected programme. Each station in the file links to its published timetable or programme page. The review date records the last editorial check of the listed schedules. Programming changes, holidays and live substitutions can affect what airs. There is no real-time detection of the audio. The guide features selected shows on seven stations across all four Atlantic provinces.

Airings are calculated for the listener's next seven calendar days using IANA time zones and the browser's time-zone rules. The guide includes a programme already underway, handles overnight slots and preserves Newfoundland's half-hour offset. If a local clock repeats during the fall change the guide takes the first occurrence. A slot whose published clock time does not exist during a spring change is omitted. Calendar entries use UTC times. Save and time-zone preferences use this device's browser storage. No account, microphone or location permission is needed.

## Maintaining the guide

Check a show's title, day, start and end against its official schedule. Verify that the listening link opens the station's own player or the page that hosts it. Edit the existing show ID when a programme moves so saved favourites continue to work. Set the review date after checking the edition, and revise this README when coverage or interpretation changes. The page computes the programme and its time from the published weekly schedule each time it opens.

The shared weekly catalogue audit checks source text for the listed slots and flags changed or unavailable pages. A successful check leaves the editorial review date intact. When a schedule changes, update its time and the adjacent source evidence in the same edit.

Run the model checks with `node --test tests/atlanticdial.test.mjs` from the repository root. The catalogue browser checks exercise province and time-zone selection, saved shows, calendar export and mobile layout.
