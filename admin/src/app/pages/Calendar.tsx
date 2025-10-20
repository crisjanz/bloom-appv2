import { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, DateSelectArg, EventClickArg, DatesSetArg } from "@fullcalendar/core";
import { Modal } from "@shared/ui/components/ui/modal";
import { useModal } from "@shared/hooks/useModal";
import PageMeta from "@shared/ui/common/PageMeta";
import { useBusinessTimezone } from "@shared/hooks/useBusinessTimezone";
import { useCalendarOrders } from "@domains/orders/hooks/useCalendarOrders";
import { useBusinessCalendar } from "@domains/orders/hooks/useBusinessCalendar";

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
    eventType?: 'order' | 'manual' | 'holiday' | 'closed'; // Track event type
    orderType?: 'pickup' | 'delivery'; // For order events
    pendingCount?: number;
    completedCount?: number;
    holidayName?: string; // For holiday events
    isOpen?: boolean; // For holiday events with special hours
    specialHours?: string; // For holiday events
  };
}

const Calendar: React.FC = () => {
  const { getBusinessDateString } = useBusinessTimezone();
  const { ordersByDate, loading, fetchOrdersForMonth } = useCalendarOrders();
  const { businessHours, holidays, isDateClosed, getHolidayForDate } = useBusinessCalendar();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLevel, setEventLevel] = useState("");
  const [manualEvents, setManualEvents] = useState<CalendarEvent[]>([]); // Separate manual events
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]); // Combined events for display
  const [visibleDateRange, setVisibleDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const calendarsEvents = {
    Danger: "danger",
    Success: "success",
    Primary: "primary",
    Warning: "warning",
  };

  // Convert order data to calendar events whenever ordersByDate changes
  useEffect(() => {
    const orderEvents: CalendarEvent[] = [];

    ordersByDate.forEach((dateData, date) => {
      // Add pickup event if there are any pickups
      if (dateData.pickup.pending > 0 || dateData.pickup.completed > 0) {
        orderEvents.push({
          id: `pickup-${date}`,
          title: 'Pickup',
          start: date,
          allDay: true,
          extendedProps: {
            calendar: 'primary',
            eventType: 'order',
            orderType: 'pickup',
            pendingCount: dateData.pickup.pending,
            completedCount: dateData.pickup.completed,
          },
        });
      }

      // Add delivery event if there are any deliveries
      if (dateData.delivery.pending > 0 || dateData.delivery.completed > 0) {
        orderEvents.push({
          id: `delivery-${date}`,
          title: 'Delivery',
          start: date,
          allDay: true,
          extendedProps: {
            calendar: 'primary',
            eventType: 'order',
            orderType: 'delivery',
            pendingCount: dateData.delivery.pending,
            completedCount: dateData.delivery.completed,
          },
        });
      }
    });

    // Combine order events with manual events
    setAllEvents([...orderEvents, ...manualEvents]);
  }, [ordersByDate, manualEvents]);

  // Generate background events for closed days and holidays
  useEffect(() => {
    if (!visibleDateRange || !businessHours) return;

    const backgroundEvents: CalendarEvent[] = [];
    const { start, end } = visibleDateRange;

    // Generate events for each day in visible range
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateString = formatDate(currentDate);
      const holiday = getHolidayForDate(dateString);

      if (holiday) {
        // Holiday event (either closed or special hours)
        if (holiday.isOpen && holiday.openTime && holiday.closeTime) {
          // Open with special hours - orange background
          backgroundEvents.push({
            id: `holiday-${dateString}`,
            title: `${holiday.name} ${holiday.openTime}-${holiday.closeTime}`,
            start: dateString,
            allDay: true,
            display: 'background',
            backgroundColor: '#fed7aa', // orange-200
            extendedProps: {
              calendar: 'warning',
              eventType: 'holiday',
              holidayName: holiday.name,
              isOpen: true,
              specialHours: `${holiday.openTime}-${holiday.closeTime}`
            }
          });
        } else {
          // Closed holiday - red background
          backgroundEvents.push({
            id: `holiday-${dateString}`,
            title: `${holiday.name} - Closed`,
            start: dateString,
            allDay: true,
            display: 'background',
            backgroundColor: '#fee2e2', // red-100
            extendedProps: {
              calendar: 'danger',
              eventType: 'holiday',
              holidayName: holiday.name,
              isOpen: false
            }
          });
        }
      } else if (isDateClosed(dateString)) {
        // Regular closed day (e.g., Sunday) - light red background
        backgroundEvents.push({
          id: `closed-${dateString}`,
          title: 'Closed',
          start: dateString,
          allDay: true,
          display: 'background',
          backgroundColor: '#fef2f2', // red-50
          extendedProps: {
            calendar: 'danger',
            eventType: 'closed'
          }
        });
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Combine all events: background events + order events + manual events
    setAllEvents((prevEvents) => {
      // Filter out old background events, keep order/manual events
      const nonBackgroundEvents = prevEvents.filter(e =>
        e.extendedProps.eventType !== 'holiday' &&
        e.extendedProps.eventType !== 'closed'
      );
      return [...backgroundEvents, ...nonBackgroundEvents];
    });
  }, [visibleDateRange, businessHours, holidays, isDateClosed, getHolidayForDate]);

  // Helper function to format date
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle calendar month/view changes - fetch orders for visible date range
  const handleDatesSet = (dateInfo: DatesSetArg) => {
    const startDate = dateInfo.start;
    const year = startDate.getFullYear();
    const month = startDate.getMonth();

    console.log('Calendar datesSet - fetching orders for:', { year, month: month + 1 });

    // Store visible date range for background events
    setVisibleDateRange({
      start: dateInfo.start,
      end: dateInfo.end
    });

    // Fetch orders for this month
    fetchOrdersForMonth(year, month);
  };

  // Initial load - fetch current month orders and set visible range
  useEffect(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    console.log('Calendar initial load - fetching current month orders');

    // Set initial visible range
    setVisibleDateRange({
      start: monthStart,
      end: monthEnd
    });

    fetchOrdersForMonth(now.getFullYear(), now.getMonth());
  }, [fetchOrdersForMonth]);

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    resetModalFields();
    setEventStartDate(selectInfo.startStr);
    setEventEndDate(selectInfo.endStr || selectInfo.startStr);
    openModal();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;

    // Only allow editing manual events, not order events
    if (event.extendedProps.eventType === 'order') {
      // TODO: Future enhancement - navigate to filtered orders page
      console.log('Order event clicked:', event.extendedProps);
      return;
    }

    setSelectedEvent(event as unknown as CalendarEvent);
    setEventTitle(event.title);
    setEventStartDate(event.start?.toISOString().split("T")[0] || "");
    setEventEndDate(event.end?.toISOString().split("T")[0] || "");
    setEventLevel(event.extendedProps.calendar);
    openModal();
  };

  const handleAddOrUpdateEvent = () => {
    if (selectedEvent) {
      // Update existing manual event
      setManualEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === selectedEvent.id
            ? {
                ...event,
                title: eventTitle,
                start: eventStartDate,
                end: eventEndDate,
                extendedProps: { calendar: eventLevel, eventType: 'manual' },
              }
            : event
        )
      );
    } else {
      // Add new manual event
      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        title: eventTitle,
        start: eventStartDate,
        end: eventEndDate,
        allDay: true,
        extendedProps: { calendar: eventLevel, eventType: 'manual' },
      };
      setManualEvents((prevEvents) => [...prevEvents, newEvent]);
    }
    closeModal();
    resetModalFields();
  };

  const resetModalFields = () => {
    setEventTitle("");
    setEventStartDate("");
    setEventEndDate("");
    setEventLevel("");
    setSelectedEvent(null);
  };

  return (
    <>
      <PageMeta
        title="React.js Calendar Dashboard | TailAdmin - Next.js Admin Dashboard Template"
        description="This is React.js Calendar Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <div className="rounded-2xl border  border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="custom-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next addEventButton",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={allEvents}
            selectable={true}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
            datesSet={handleDatesSet}
            customButtons={{
              addEventButton: {
                text: "Add Event +",
                click: openModal,
              },
            }}
          />
        </div>
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-[700px] p-6 lg:p-10"
        >
          <div className="flex flex-col px-2 overflow-y-auto custom-scrollbar">
            <div>
              <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
                {selectedEvent ? "Edit Event" : "Add Event"}
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Plan your next big moment: schedule or edit an event to stay on
                track
              </p>
            </div>
            <div className="mt-8">
              <div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Event Title
                  </label>
                  <input
                    id="event-title"
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
              </div>
              <div className="mt-6">
                <label className="block mb-4 text-sm font-medium text-gray-700 dark:text-gray-400">
                  Event Color
                </label>
                <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                  {Object.entries(calendarsEvents).map(([key, value]) => (
                    <div key={key} className="n-chk">
                      <div
                        className={`form-check form-check-${value} form-check-inline`}
                      >
                        <label
                          className="flex items-center text-sm text-gray-700 form-check-label dark:text-gray-400"
                          htmlFor={`modal${key}`}
                        >
                          <span className="relative">
                            <input
                              className="sr-only form-check-input"
                              type="radio"
                              name="event-level"
                              value={key}
                              id={`modal${key}`}
                              checked={eventLevel === key}
                              onChange={() => setEventLevel(key)}
                            />
                            <span className="flex items-center justify-center w-5 h-5 mr-2 border border-gray-300 rounded-full box dark:border-gray-700">
                              <span
                                className={`h-2 w-2 rounded-full bg-white ${
                                  eventLevel === key ? "block" : "hidden"
                                }`}
                              ></span>
                            </span>
                          </span>
                          {key}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Enter Start Date
                </label>
                <div className="relative">
                  <input
                    id="event-start-date"
                    type="date"
                    value={eventStartDate}
                    onChange={(e) => setEventStartDate(e.target.value)}
                    className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Enter End Date
                </label>
                <div className="relative">
                  <input
                    id="event-end-date"
                    type="date"
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6 modal-footer sm:justify-end">
              <button
                onClick={closeModal}
                type="button"
                className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
              >
                Close
              </button>
              <button
                onClick={handleAddOrUpdateEvent}
                type="button"
                className="btn btn-success btn-update-event flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto"
              >
                {selectedEvent ? "Update Changes" : "Add Event"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

const renderEventContent = (eventInfo: any) => {
  const { extendedProps } = eventInfo.event;

  // Render order events with completion status badges
  if (extendedProps.eventType === 'order') {
    const pendingCount = extendedProps.pendingCount || 0;
    const completedCount = extendedProps.completedCount || 0;
    const orderType = extendedProps.orderType || '';

    return (
      <div className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium w-full">
        <span className="text-gray-700 dark:text-gray-300">{orderType === 'pickup' ? 'Pickup' : 'Delivery'}</span>
        <div className="flex items-center gap-1 ml-auto">
          {pendingCount > 0 && (
            <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900 dark:text-red-200">
              {pendingCount}
            </span>
          )}
          {completedCount > 0 && (
            <span className="inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-200">
              ✓{completedCount}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Render manual events with original styling
  const colorClass = `fc-bg-${extendedProps.calendar?.toLowerCase() || 'primary'}`;
  return (
    <div
      className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm`}
    >
      <div className="fc-daygrid-event-dot"></div>
      <div className="fc-event-time">{eventInfo.timeText}</div>
      <div className="fc-event-title">{eventInfo.event.title}</div>
    </div>
  );
};

export default Calendar;
