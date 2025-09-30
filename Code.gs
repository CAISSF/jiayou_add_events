// ** WARNING **
// If the script below is modified improperly, running it may cause irrevocable damage.
// The script below comes with absolutely no warranty. Use it at your own risk.

function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index").setTitle(
    'Add 加油 Events'
  );
}

// Used by Index.html for username, dropdown list of calendar names and default calendar name
function getCalendarNamesAndDefault() {
  let userName = Session.getActiveUser().getEmail();
  let allCalendars = CalendarApp.getAllCalendars();
  let allCalendarNames = [];
  for (const calendar of allCalendars) {
    allCalendarNames.push(calendar.getName());
  }
  let defaultCalendarName = CalendarApp.getDefaultCalendar().getName();
  var calendarRef;
  var calendarNameRef = "";
  let query = ["J Day", "I Day", "A Day", "Y Day", "O Day", "U Day"]; // example
  var endDate;

  // Relay but hide reference calendar
  var found = false;
  var howMany = 0;
  for (var i = 0; i < allCalendars.length; i++) {
    if (found === false || howMany === 1) {
      var now = new Date();
      var oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(now.getFullYear() + 1); // sooner, if calendar cuts off
      var eventFind = allCalendars[i].getEvents(now, oneYearFromNow);
      for (var j = 0; j < eventFind.length; j++) {
        var event = eventFind[j];
        if (query.includes(event.getTitle())) {
          calendarRef = CalendarApp.getCalendarById(allCalendars[i].getId()); // calendar is still hard-coded, but this way the ID is hidden 
          calendarNameRef = String(allCalendars[i].getName());
          allCalendarNames = allCalendarNames.filter(name => name != calendarNameRef); // comment out this line to display the reference calendar
          found = true;
          howMany += 1;
          break;
        }
        // else {
        //   calendarNameRef = ""; <-- don't do this! if found = true and howMany = 1 and loop runs again, then calendarNameRef = "" again
        // }
      }
    }
  }

  // Search for the last event date, if calendarNameRef exists
  if (calendarNameRef !== "") {
    var now = new Date();
    var oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(now.getFullYear() + 1); // sooner, if calendar cuts off
    // Search for all events between now and one year from now
    search(now, oneYearFromNow);
    function search(from, to) {
      if (from > to) {
        endDate = null;
      } else {
        var eventsAll = calendarRef.getEvents(from, to);
        for (var i = eventsAll.length-1; i >= 0; i--) {
          if (query.includes(eventsAll[i].getTitle())) {
            endDate = eventsAll[i].getStartTime().toLocaleDateString("en-US", { // else all-day recurring events may be misidentified as non-all-day events, now that checking query we could reuse getAllDayStartDate() again
                month: "short",
                day: "numeric",
                year: "numeric",
              })
              .replace(/,/g, ""); // removes comma
            // Examples: Jan 4 2024, Mar 14 2025
            // Format is consistent with default date format in Create 加油 ("jiā yóu") Calendar web app
            break;
          }
        }
      }
      return null;
    }
  }

  return {
    username: userName,
    calendars: allCalendarNames,
    defaultCal: defaultCalendarName,
    reference: calendarNameRef, // will pump to addEvents() instead of looping again
    conflict: howMany,
    endDate: endDate,
  };
}

function addEvents(
  calendarName,
  calendarNameRef,
  howMany,
  query,
  frequency,
  title,
  guests,
  location,
  description,
  start,
  end,
  startTime,
  endTime,
  dryRun,
  // chinese
) {
  var calendars = CalendarApp.getAllCalendars(); // Get all calendars
  var calendarId = ""; // Initially null
  var calendarIdRef = ""; // Initially null

  // handle exception
  if (query.length === 0) return "Select a letter day!";

  // Loop through all calendars and find the one with the matching name
  for (var i = 0; i < calendars.length; i++) {
    if (calendars[i].getName() === calendarName) {
      calendarId = String(calendars[i].getId()); // Assign the calendar ID
    }
  }
  
  // Find reference calendar
  for (var k = 0; k < calendars.length; k++) {
    if (calendars[k].getName() === calendarNameRef) {
      calendarIdRef = String(calendars[k].getId()); // Assign the calendar ID
    }
  }

  // check frequency
  if (frequency === "")
    frequency = 1; // default

  // recheck if reference calendar doesn't exist
  if (calendarIdRef === "") {
    return "Again, no calendars contain letter days!"; // handle error differently, since sometimes calendar exists but backend service may be down
  }

  // recheck for multiple (i.e., conflicting) reference calendars
  if (howMany > 1) {
    return "Again, multiple calendars contain letter days!"; // handle error
  }

  // Access the user calendar and reference calendar
  var calendar = CalendarApp.getCalendarById(calendarId);
  var calendarRef = CalendarApp.getCalendarById(calendarIdRef); // again, calendar is still hard-coded, but this way the ID is hidden

  // handle additional exceptions
  if (start.includes(",")) {
    return "Remove comma from start date!"; // for consistency
  }
  if (end.includes(",")) {
    return "Remove comma from end date!"; // for consistency
  }
  if (
    startTime !== "" && // chinese === true &&
    !startTime.includes(":")    
  )
    return "Start time is missing colon!"; // for consistency, any format
  if (
    startTime !== "" &&
    startTime.includes(" ") &&
    (!startTime.includes("AM") &&
      !startTime.includes("am") && // relaxed requirement
      !startTime.includes("PM") &&
      !startTime.includes("pm")) // relaxed requirement
  )
    return "Start time is missing AM/PM!"; // for consistency, 12-hour time format
  if (
    startTime !== "" && // chinese === false &&
    (startTime.includes("AM") ||
      startTime.includes("am") || // relaxed requirement
      startTime.includes("PM") ||
      startTime.includes("pm")) && // relaxed requirement
    !startTime.includes(" ")
  ) 
    return "Add finger space between start time and AM/PM!"; // for consistency, 12-hour time format
  if (
    endTime !== "" && // chinese === true &&
    !endTime.includes(":")    
  )
    return "End time is missing colon!"; // for consistency, any format
  if (
    endTime !== "" &&
    endTime.includes(" ") &&
    (!endTime.includes("AM") &&
      !endTime.includes("am") && // relaxed requirement
      !endTime.includes("PM") &&
      !endTime.includes("pm")) // relaxed requirement
  )
    return "End time is missing AM/PM!"; // for consistency, 12-hour time format
  if (
    endTime !== "" && // chinese === false &&
    (endTime.includes("AM") ||
      endTime.includes("am") || // relaxed requirement
      endTime.includes("PM") ||
      endTime.includes("pm")) && // relaxed requirement
    !endTime.includes(" ")
  ) 
    return "Add finger space between end time and AM/PM!"; // for consistency, 12-hour time format

  const regex = /^\d{4}-(\d{2})-(\d{2})$/; // regular expression for identifying a ISO-formatted date (YYYY-MM-DD)

  // Check for null dates
  if (start !== "" && end !== "") {
    // Set the search parameters
    // but test if dates are ISO-formatted first
    if (regex.test(start) === true) {
      start = new Date(start);
      start = adjustTime(start);
    } else start = new Date(start);
    if (regex.test(end) === true) {
      end = new Date(end); // excluded from search
      end = adjustTime(end);
      end.setDate(end.getDate() + 1); // include end date in search
    } else {
      end = new Date(end); // excluded from search
      end.setDate(end.getDate() + 1); // include end date in search
    }
    // Search for events with title between start and end dates
    search(start, end);
  } else if (start === "" && end !== "") {
    // Set the search parameters
    var now = new Date();
    // test if date is ISO-formatted first
    if (regex.test(end) === true) {
      end = new Date(end); // excluded from search
      end = adjustTime(end);
      end.setDate(end.getDate() + 1); // include end date in search
    } else {
      end = new Date(end); // excluded from search
      end.setDate(end.getDate() + 1); // include end date in search
    }
    // Search for events with title between now and end date
    search(now, end);
  } else if (start !== "" && end === "") {
    // Set the search parameters
    // but test if date is ISO-formatted first
    if (regex.test(start) === true) {
      start = new Date(start);
      start = adjustTime(start);
    } else start = new Date(start);
    // var schoolDateEnd = new Date("2025-6-12"); <- redundant since internal calendar events end same date
    var oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(start.getFullYear() + 1); // sooner, if calendar cuts off
    // Search for events with title between start and one year from start
    // search(start, schoolDateEnd);
    search(start, oneYearFromNow);
  } else {
    // Set the search parameters
    var now = new Date();
    // var schoolDateEnd = new Date("2025-6-12"); <- again, redundant since internal calendar events end same date
    var oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(now.getFullYear() + 1); // sooner, if calendar cuts off
    // Search for events with title between now and one year from now
    // search(now, schoolDateEnd);
    search(now, oneYearFromNow);
  }

  // consolidated into nested function
  var events;
  function search(from, to) {
    if (from > to) {
      events = null;
    } else {
      var eventsAll = calendarRef.getEvents(from, to); // reusing
      events = [];
      for (var l = 0; l < eventsAll.length; l++) {
        var event = eventsAll[l];
        if (query.includes(event.getTitle())) {
          // may also pick up shorter titles, but it is unlikely such shorter titles may exist
          // MORE RELIABLE THAN `{ search: query }`!
          // `event.getTitle() === query` could work too, must use for updating/deleting scripts though
          events.push(event);
        }
      }
    }
    return null;
  }

  // check invalid date range
  if (events === null) {
    return "Event start time must be before event end time"; // handle error
  }

  // Check if query finds no events
  if (events.length === 0) {
    return 'No "' + query.join(", ") + '" events exist!';
  }

  // Check if times are null
  if (startTime === "" && endTime === "") {
    // make all-day event, later
  } else if (startTime !== "" && endTime === "") {
    // Parse the time, and convert 12-hour time to 24-hour time if AM/PM utilized
    startTime = parseTime(startTime);

    endTime = [];
    endTime[0] = startTime[0] + 1; // simply add 1 hour
    endTime[1] = startTime[1];
  } else if (startTime === "" && endTime !== "") {
    // Parse the time, and convert 12-hour time to 24-hour time if AM/PM utilized
    endTime = parseTime(endTime);

    startTime = [];
    startTime[0] = endTime[0] - 1; // simply subtract 1 hour
    startTime[1] = endTime[1];
  } else {
    // Parse the time, and convert 12-hour time to 24-hour time if AM/PM utilized
    startTime = parseTime(startTime);
    endTime = parseTime(endTime);
  }

  // Track dates when events with title occur
  var date = {};

  // Counter for all events
  var eventIndex = 0;

  // Loop through each event found
  events.forEach(function (event) {
    var eventDate = event.getStartTime();

    // Extract just the date part as a string
    var dateKey = eventDate.toDateString();

    // Store the date in the dictionary
    date[dateKey] = true; // order is not preserved, so use Object.keys(date) below to sort dictionary keys into an array

  });

  // chain subsequent events to each first event
  var firstEvent = true;
  // get letter days from query
  var eventSeries = [];
  for (var m = 0; m < query.length; m++) { // strings act as placeholders
    if (query[m].includes("J")) eventSeries[m] = "eventSeriesJ";
    else if (query[m].includes("I")) eventSeries[m] = "eventSeriesI";
    else if (query[m].includes("A")) eventSeries[m] = "eventSeriesA";
    else if (query[m].includes("Y")) eventSeries[m] = "eventSeriesY";
    else if (query[m].includes("O")) eventSeries[m] = "eventSeriesO";
    else if (query[m].includes("U")) eventSeries[m] = "eventSeriesU";
  }
  // breaking up the series like this helps mitigate issue #4
  // https://github.com/saegl5/jiayou_add_events/issues/4

  // Counter for only events keep
  // var indexKeep = eventSeries.length*(frequency-1); // start very first date at this index <-- uncomment to skip first instance(s)
  var indexKeep = 0; // always start very first date at this index <-- comment out to skip first instance(s)

  // extract the first date from the dictionary
  var firstDate = []; // may have multiple first dates
  var dateStartTime = []; // subsequently, may have multiple dateStartTimes
  var dateEndTime = []; // subsequently, may have multiple dateEndTimes

  // not all letter days may be used, but it is still easy to pair up firstDate with the letter
  // var firstDateIndex = eventSeries.length*(frequency-1); // equal to indexKeep initially but then incremented below <-- uncomment to skip first instance(s)
  var firstDateIndex = 0; // equal to indexKeep initially but then incremented below <-- comment out to skip first instance(s)
  for (var n = 0; n < eventSeries.length; n++) {
    firstDate[n] = new Date(Object.keys(date)[firstDateIndex]); // need to sort dictionary keys into an array, select one key and cast it as a function 
    dateStartTime[n] = new Date(
      firstDate[n].getFullYear(),
      firstDate[n].getMonth(),
      firstDate[n].getDate(),
      startTime[0],
      startTime[1]
    );
    dateEndTime[n] = new Date(
      firstDate[n].getFullYear(),
      firstDate[n].getMonth(),
      firstDate[n].getDate(),
      endTime[0],
      endTime[1]
    );
    firstDateIndex++; // subsequent first dates, if any, immediately follow initial one
  }

  // check invalid time range
  if (dateStartTime > dateEndTime) {
    return "Event start time must be before event end time"; // handle error
  }

  // Iterate over the dates with events titled query and create a new event for the series at start time
  for (var datestr in date) { // every dictionary key in date, key is ordered too
    var eventDate = new Date(datestr); // "eventDate" above is isolated in its own loop
    // if (!dryRun) { do regardless
    // Check if description includes a space
    let includesSpace = description.includes(" "); // otherwise, links will break
    // Check if description is a link
    let includesHttp = description.includes("http");

    // Event uses color of calendar to which it is added

    // Create the new event
    // Utilities.sleep(1000); // mitigate use limit later
    createEvent(frequency, includesSpace, includesHttp); // split up events, all of which have the same event details, into separate series
    // }

    // function nested because it relies on many parameters
    function createEvent(frequency, includesSpace, includesHttp) {
      if (eventIndex === indexKeep) {
        indexKeep++;
        if (indexKeep % eventSeries.length === 0) // jump every eventSeries.length
          indexKeep = indexKeep + eventSeries.length*(frequency-1);
        if (eventIndex >= eventSeries.length + eventSeries.length*(frequency-1))
          // could also use query.length
          firstEvent = false;

        if (!dryRun) {
          Utilities.sleep(1000); // mitigate use limit now
          if (firstEvent) {
            var eventOptions = {
              location: location,
              description: 
                includesSpace ? description :
                includesHttp ? `<a href="${description}" target="_blank" >Agenda</a>` :
                description,
              guests: guests,
            };

            if (startTime === "" && endTime === "") {
              // make all-day event
              eventSeries[eventIndex % eventSeries.length] = calendar.createAllDayEventSeries(
                title,
                firstDate[eventIndex % eventSeries.length],
                CalendarApp.newRecurrence().addDate(eventDate),
                eventOptions
              );
            } else {
              // make regular event
              eventSeries[eventIndex % eventSeries.length] = calendar.createEventSeries(
                title,
                dateStartTime[eventIndex % eventSeries.length],
                dateEndTime[eventIndex % eventSeries.length],
                CalendarApp.newRecurrence().addDate(eventDate),
                eventOptions
              );
            }
            // can't set firstEvent = false yet
          } // chain subsequent event to first event
          else {
            if (startTime === "" && endTime === "") {
              eventSeries[eventIndex % eventSeries.length].setRecurrence(
                CalendarApp.newRecurrence().addDate(eventDate),
                firstDate[eventIndex % eventSeries.length] // date of first event only
              );
            } else {
              eventSeries[eventIndex % eventSeries.length].setRecurrence(
                CalendarApp.newRecurrence().addDate(eventDate),
                dateStartTime[eventIndex % eventSeries.length], // date start time of first event only
                dateEndTime[eventIndex % eventSeries.length] // date end time of first event only
              );
            }
          }
        }

      // Log which events were added
        Logger.log('Created "' + title + '" on ' + eventDate + "!");
      }
      return null;
    }

    eventIndex++;
  }

  return "Events created! Go to your Google Calendar...";
}

// Function to adjust time for ISO-formatted date
function adjustTime(isoDate) {
  // Dates formatted as YYYY-MM-DD use Coordinated Universal Time, whereas dates formatted differently use local time
  // So, we will have to adjust ISO dates' time
  let timezoneOffset = isoDate.getTimezoneOffset(); // in minutes, varies depending on local time zone and daylight saving time (if observed)
  let adjustedTime = isoDate.getTime() + timezoneOffset * 60 * 1000; // milliseconds since January 1, 1970 00:00:00 + timezoneOffset in milliseconds
  let adjustedDate = new Date(adjustedTime);

  return adjustedDate;
}

// Function to parse the time and to convert 12-hour time to 24-hour time if AM/PM utilized
function parseTime(time) {
  let [timePart, modifier] = time.split(" "); // modifier ignored if missing
  time = timePart.split(":");

  // Split strings into lists of hours and minutes
  time[0] = parseInt(time[0]);
  time[1] = parseInt(time[1]);

  if (modifier === "AM" && time[0] === 12) time[0] = time[0] - 12;
  else if (modifier === "PM" && time[0] !== 12) time[0] = time[0] + 12;

  return time;
}
