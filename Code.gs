// ** WARNING **
// If the script below is modified improperly, running it may cause irrevocable damage.
// The script below comes with absolutely no warranty. Use it at your own risk.

// Used for index.html for dropdown list of calendar names
function getCalendarNames() {
  let allCalendars = CalendarApp.getAllCalendars();

  let allCalendarsNames = [];
  for (const c of allCalendars) {
    allCalendarsNames.push(c.getName());
  }
  return allCalendarsNames;
}

// Used to alert users if they select internal calendar
function getInternalCalendarNameById(calendarId) {
  var calendar = CalendarApp.getCalendarById(calendarId);
    return calendar.getName();
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index");
}

function addEvents(
  calendarName,
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
  dryRun
) {
  var calendars = CalendarApp.getAllCalendars(); // Get all calendars
  var calendarId = ""; // Initially null

  var referenceCalendar = CalendarApp.getCalendarById("cais.org_ameqcd19592e51dtlrqp67jtnc@group.calendar.google.com");

  // Loop through all calendars and find the one with the matching name
  for (var i = 0; i < calendars.length; i++) {
    if (calendars[i].getName() === calendarName) {
      calendarId = String(calendars[i].getId()); // Assign the calendar ID
    }
  }

  // Check if loop finds no calendar
  if (calendarId === "") {
    var calendarDefault = CalendarApp.getDefaultCalendar();
    return (
      'No "' +
      calendarName +
      '" calendar! But "' +
      calendarDefault.getName() +
      '" exists.'
    ); // handle null
  }

  // Access the calendar
  var calendar = CalendarApp.getCalendarById(calendarId);

  // handle exceptions
  if (start.includes(",") || end.includes(",")) {
    return "Use accepted date formats!"; // for consistency
  }

  // Check for null dates
  if (start !== "" && end !== "") {
    // Set the search parameters
    start = new Date(start);
    end = new Date(end); // excluded from search
    end.setDate(end.getDate() + 1); // include end date in search
    // Search for events with title between start and end dates
    search(start, end);
  } else if (start === "" && end !== "") {
    // Set the search parameters
    var now = new Date();
    end = new Date(end); // excluded from search
    end.setDate(end.getDate() + 1); // include end date in search
    // Search for events with title between now and end date
    search(now, end);
  } else if (start !== "" && end === "") {
    // Set the search parameters
    start = new Date(start);
    var schoolDateEnd = new Date("2025-6-12");
    // Search for events with title between start and one year from start
    search(start, schoolDateEnd);
  } else {
    // Set the search parameters
    var now = new Date();
    var schoolDateEnd = new Date("2025-6-12");
    // Search for events with title between now and one year from now
    search(now, schoolDateEnd);
  }

  // consolidated into nested function
  var events;
  function search(from, to) {
    if (from > to) {
      events = null;
    } else {
      var eventsAll = referenceCalendar.getEvents(from, to);
      events = [];
      for (var k = 0; k < eventsAll.length; k++) {
        var event = eventsAll[k];
        if (query.includes(event.getTitle())) {
          // MORE RELIABLE THAN `{ search: query }`!
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
    return 'No "' + query + '" events exist!';
  }

  // Check if times are null
  if (startTime === "" && endTime === "") {
    // make all-day event, later
  } else if (startTime !== "" && endTime === "") {
    // Handle 12-hour time, if utilized
    var [timePart, modifier] = startTime.split(" "); // modifier undefined if missing
    // Split strings into lists of hours and minutes
    startTime = timePart.split(":");
    startTime[0] = parseInt(startTime[0]);
    startTime[1] = parseInt(startTime[1]);
    if (modifier === "AM" && startTime[0] === 12)
      startTime[0] = startTime[0] - 12;
    else if (modifier === "PM" && startTime[0] !== 12)
      startTime[0] = startTime[0] + 12;

    endTime = [];
    endTime[0] = startTime[0] + 1; // simply add 1 hour
    endTime[1] = startTime[1];
  } else if (startTime === "" && endTime !== "") {
    // Handle 12-hour time, if utilized
    var [timePart, modifier] = endTime.split(" "); // modifier undefined if missing
    // Split strings into lists of hours and minutes
    endTime = timePart.split(":");
    endTime[0] = parseInt(endTime[0]);
    endTime[1] = parseInt(endTime[1]);
    if (modifier === "AM" && endTime[0] === 12)
      endTime[0] = endTime[0] - 12;
    else if (modifier === "PM" && endTime[0] !== 12)
      endTime[0] = endTime[0] + 12;

    startTime = [];
    startTime[0] = endTime[0] - 1; // simply subtract 1 hour
    startTime[1] = endTime[1];
  } else {
    // Handle 12-hour time, if utilized
    var [timePart, modifier] = startTime.split(" "); // modifier undefined if missing
    // Split strings into lists of hours and minutes
    startTime = timePart.split(":");
    startTime[0] = parseInt(startTime[0]);
    startTime[1] = parseInt(startTime[1]);
    if (modifier === "AM" && startTime[0] === 12)
      startTime[0] = startTime[0] - 12;
    else if (modifier === "PM" && startTime[0] !== 12)
      startTime[0] = startTime[0] + 12;

    var [timePart, modifier] = endTime.split(" "); // modifier undefined if missing
    endTime = timePart.split(":");
    endTime[0] = parseInt(endTime[0]);
    endTime[1] = parseInt(endTime[1]);
    if (modifier === "AM" && endTime[0] === 12)
      endTime[0] = endTime[0] - 12;
    else if (modifier === "PM" && endTime[0] !== 12)
      endTime[0] = endTime[0] + 12;
  }

  // Track dates when events with title occur
  var date = {};

  // Event counter
  var eventIndex = 0;

  // Loop through each event found
  events.forEach(function (event) {
    var eventDate = event.getStartTime();

    // Extract just the date part as a string
    var dateKey = eventDate.toDateString();

    // Store the date in the dictionary
    date[dateKey] = true;
  });

  var firstEvent = true; // for first event, to which subsequent events will be chained
  var eventSeries = ""; // for chaining events
  var indexKeep = query.length*(frequency-1); // start first date at this index

  // every event will have the same first date
  var firstDate;
  // for (var k in date) {
    // firstDate = new Date(k);
    // break;
  // }
  firstDate = new Date(Object.keys(date)[indexKeep]); // sort dictionary keys into an array, and select one at index

  var dateStartTime = new Date(
    firstDate.getFullYear(),
    firstDate.getMonth(),
    firstDate.getDate(),
    startTime[0],
    startTime[1]
  );
  var dateEndTime = new Date(
    firstDate.getFullYear(),
    firstDate.getMonth(),
    firstDate.getDate(),
    endTime[0],
    endTime[1]
  );

  // Iterate over the dates with events titled query and create a new event for the series at start time
  for (var dateStr in date) {
    var eventDate = new Date(dateStr)
    // check invalid time range
    if (dateStartTime > dateEndTime) {
      return "Event start time must be before event end time"; // handle error
    }

    if (!dryRun) {
      // Check if description is a link
      var includesHttp = description.includes("http"); // "let" is fine, using "var" for flexibility
      // Check if description includes a space
      let includesSpace = description.includes(" "); // otherwise, links will break
      // Create the new event
      createEvent(calendar, includesHttp, includesSpace);
    }

    // function nested because it relies on many parameters
    function createEvent(calendar, includesHttp, includesSpace) {
      if (eventIndex === indexKeep) {
        indexKeep++;
        if (indexKeep % query.length === 0) // jump every query.length
          indexKeep = indexKeep + query.length*(frequency-1);
        if (firstEvent) {
          if (includesHttp) {
            if (startTime === "" && endTime === "") {
              // make all-day event
              eventSeries = calendar.createAllDayEventSeries(
                title,
                eventDate,
                CalendarApp.newRecurrence().addDate(eventDate),
                {
                  location: location,
                  description:
                    includesSpace ? description :
                    '<a href="' + description + '" target="_blank" >Agenda</a>',
                  guests: guests,
                }
              );
            } else {
              // make regular event
              eventSeries = calendar.createEventSeries(
                title,
                dateStartTime,
                dateEndTime,
                CalendarApp.newRecurrence().addDate(eventDate),
                {
                  location: location,
                  description:
                    includesSpace ? description :
                    '<a href="' + description + '" target="_blank" >Agenda</a>',
                  guests: guests,
                }
              );
            }
          } else {
            if (startTime === "" && endTime === "") {
              // make all-day event
              eventSeries = calendar.createAllDayEventSeries(
                title,
                eventDate,
                CalendarApp.newRecurrence().addDate(eventDate),
                {
                  location: location,
                  description: description,
                  guests: guests,
                }
              );
            } else {
              // make regular event
              eventSeries = calendar.createEventSeries(
                title,
                dateStartTime,
                dateEndTime,
                CalendarApp.newRecurrence().addDate(eventDate),
                {
                  location: location,
                  description: description,
                  guests: guests,
                }
              );
            }
          }
          firstEvent = false;
        } // chain subsequent event to first event
        else {
          if (startTime === "" && endTime === "") {
            eventSeries.setRecurrence(
              CalendarApp.newRecurrence().addDate(eventDate),
              firstDate
            );
          }
          else {
            eventSeries.setRecurrence(
              CalendarApp.newRecurrence().addDate(eventDate),
              dateStartTime,
              dateEndTime
            );
          }
        }
      }
      return null;
    }

    // Log which events were added
    Logger.log("Created a new event on " + eventDate);
    eventIndex++;
  }
  return "Events created! Go to your Google Calendar...";
}
