import { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { getBusinessHours, getHolidays } from "../services/deliveryService";

const DeliveryDatePicker = ({ selectedDate, onDateChange, required = false, variant = "default" }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [businessHours, setBusinessHours] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const [hours, holidaysData] = await Promise.all([
          getBusinessHours(),
          getHolidays()
        ]);
        setBusinessHours(hours);
        setHolidays(holidaysData.holidays || []);
      } catch (error) {
        console.error('Failed to load delivery settings:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const isDayEnabled = (date) => {
    if (!businessHours) return false;

    const dayOfWeek = date.getDay();
    const dayMap = {
      0: 'sundayEnabled',
      1: 'mondayEnabled',
      2: 'tuesdayEnabled',
      3: 'wednesdayEnabled',
      4: 'thursdayEnabled',
      5: 'fridayEnabled',
      6: 'saturdayEnabled',
    };

    return businessHours[dayMap[dayOfWeek]] === true;
  };

  const isHoliday = (date) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return holidays.some(holiday => {
      const holidayStart = new Date(holiday.startDate);
      const holidayEnd = new Date(holiday.endDate);
      holidayStart.setHours(0, 0, 0, 0);
      holidayEnd.setHours(0, 0, 0, 0);

      return checkDate >= holidayStart && checkDate <= holidayEnd && !holiday.isOpen;
    });
  };

  const isDateAvailable = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // Must be tomorrow or later
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (checkDate < tomorrow) return false;

    // Must be within 60 days
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 60);
    if (checkDate > maxDate) return false;

    // Must be an enabled day
    if (!isDayEnabled(checkDate)) return false;

    // Must not be a holiday
    if (isHoliday(checkDate)) return false;

    return true;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty slots for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: null, date: null, isCurrentMonth: false, isEmpty: true });
    }

    // Add current month's days only
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({ day, date, isCurrentMonth: true, isEmpty: false });
    }

    // Add empty slots to complete the grid (6 rows * 7 days = 42 total)
    const remainingDays = 42 - days.length;
    for (let i = 0; i < remainingDays; i++) {
      days.push({ day: null, date: null, isCurrentMonth: false, isEmpty: true });
    }

    return days;
  };

  const handleDateClick = (date) => {
    if (isDateAvailable(date)) {
      const dateString = date.toISOString().split('T')[0];
      onDateChange(dateString);
      setIsOpen(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'Pick a delivery date';
    const date = new Date(dateString + 'T12:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const monthYearDisplay = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const days = getDaysInMonth(currentMonth);

  const isCompact = variant === "compact";

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex items-center border-b border-stroke/30 py-3 dark:border-dark-3/30">
          <label className="w-[35%] shrink-0 pr-3 text-sm font-medium text-dark dark:text-white">
            Delivery {required && <span className="text-red-500">*</span>}
          </label>
          <div className="flex-1 text-base text-body-color dark:text-dark-6">Loading...</div>
        </div>
      </div>
    );
  }

  if (isCompact) {
    return (
      <div className="w-full">
        <div className="flex items-center border-b border-stroke/30 py-3 dark:border-dark-3/30">
          <label className="w-[35%] shrink-0 pr-3 text-sm font-medium text-dark dark:text-white">
            Delivery {required && <span className="text-red-500">*</span>}
          </label>
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="w-full bg-transparent pr-8 text-left text-base text-dark outline-hidden dark:text-white"
            >
              <span className={selectedDate ? "" : "text-body-color/40 dark:text-dark-6/40"}>
                {selectedDate ? formatDisplayDate(selectedDate) : "Pick a date"}
              </span>
            </button>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-body-color dark:text-dark-6">
              <svg
                width="18"
                height="18"
                viewBox="0 0 21 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 3.3125H16.3125V2.625C16.3125 2.25 16 1.90625 15.5937 1.90625C15.1875 1.90625 14.875 2.21875 14.875 2.625V3.28125H6.09375V2.625C6.09375 2.25 5.78125 1.90625 5.375 1.90625C4.96875 1.90625 4.65625 2.21875 4.65625 2.625V3.28125H3C1.9375 3.28125 1.03125 4.15625 1.03125 5.25V16.125C1.03125 17.1875 1.90625 18.0938 3 18.0938H18C19.0625 18.0938 19.9687 17.2187 19.9687 16.125V5.25C19.9687 4.1875 19.0625 3.3125 18 3.3125ZM3 4.71875H4.6875V5.34375C4.6875 5.71875 5 6.0625 5.40625 6.0625C5.8125 6.0625 6.125 5.75 6.125 5.34375V4.71875H14.9687V5.34375C14.9687 5.71875 15.2812 6.0625 15.6875 6.0625C16.0937 6.0625 16.4062 5.75 16.4062 5.34375V4.71875H18C18.3125 18.71875 18.5625 4.96875 18.5625 5.28125V7.34375H2.46875V5.28125C2.46875 4.9375 2.6875 4.71875 3 4.71875ZM18 16.6562H3C2.6875 16.6562 2.4375 16.4062 2.4375 16.0937V8.71875H18.5312V16.125C18.5625 16.4375 18.3125 16.6562 18 16.6562Z"
                  fill="currentColor"
                />
              </svg>
            </span>

            {isOpen && (
              <div className="absolute bottom-full right-0 z-50 mb-2 flex w-[340px] flex-col rounded-xl bg-white p-3 shadow-four dark:bg-dark-2 dark:shadow-box-dark sm:p-4">
            <div className="flex items-center justify-between pb-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-[7px] border-[.5px] border-stroke bg-gray-2 text-dark hover:border-primary hover:bg-primary hover:text-white dark:border-dark-3 dark:bg-dark dark:text-white"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="fill-current"
                >
                  <path d="M16.2375 21.4875C16.0125 21.4875 15.7875 21.4125 15.6375 21.225L7.16249 12.6C6.82499 12.2625 6.82499 11.7375 7.16249 11.4L15.6375 2.77498C15.975 2.43748 16.5 2.43748 16.8375 2.77498C17.175 3.11248 17.175 3.63748 16.8375 3.97498L8.96249 12L16.875 20.025C17.2125 20.3625 17.2125 20.8875 16.875 21.225C16.65 21.375 16.4625 21.4875 16.2375 21.4875Z" />
                </svg>
              </button>
              <span className="text-base font-medium capitalize text-dark dark:text-white">
                {monthYearDisplay}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-[7px] border-[.5px] border-stroke bg-gray-2 text-dark hover:border-primary hover:bg-primary hover:text-white dark:border-dark-3 dark:bg-dark dark:text-white"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="fill-current"
                >
                  <path d="M7.7625 21.4875C7.5375 21.4875 7.35 21.4125 7.1625 21.2625C6.825 20.925 6.825 20.4 7.1625 20.0625L15.0375 12L7.1625 3.97498C6.825 3.63748 6.825 3.11248 7.1625 2.77498C7.5 2.43748 8.025 2.43748 8.3625 2.77498L16.8375 11.4C17.175 11.7375 17.175 12.2625 16.8375 12.6L8.3625 21.225C8.2125 21.375 7.9875 21.4875 7.7625 21.4875Z" />
                </svg>
              </button>
            </div>

            <div className="flex justify-between pb-1.5 pt-2 text-xs font-medium capitalize text-body-color dark:text-dark-6">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                <span key={day} className="flex h-[32px] w-[32px] items-center justify-center">
                  {day}
                </span>
              ))}
            </div>

            {[0, 1, 2, 3, 4, 5].map((week) => (
              <div key={week} className="flex justify-between pb-1.5 text-sm font-medium">
                {days.slice(week * 7, week * 7 + 7).map((dayInfo, index) => {
                  // Empty cell - render invisible placeholder
                  if (dayInfo.isEmpty) {
                    return (
                      <div
                        key={index}
                        className="flex h-[32px] w-[32px] items-center justify-center"
                      />
                    );
                  }

                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const checkDate = new Date(dayInfo.date);
                  checkDate.setHours(0, 0, 0, 0);
                  const isToday = checkDate.getTime() === today.getTime();

                  const isAvailable = dayInfo.isCurrentMonth && isDateAvailable(dayInfo.date);
                  const isSelected = selectedDate === dayInfo.date.toISOString().split('T')[0];
                  const isPastOrDisabled = !isAvailable;

                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={isPastOrDisabled}
                      onClick={() => handleDateClick(dayInfo.date)}
                      className={`flex h-[32px] w-[32px] items-center justify-center rounded-[7px] border-[.5px] ${
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : isToday
                          ? 'border-primary bg-primary/10 text-primary dark:border-primary dark:bg-primary/20'
                          : isPastOrDisabled
                          ? 'border-transparent text-body-color opacity-40 cursor-not-allowed dark:text-dark-6'
                          : 'border-transparent text-dark hover:border-stroke hover:bg-gray-2 dark:text-white dark:hover:border-dark-3 dark:hover:bg-dark cursor-pointer'
                      }`}
                    >
                      {String(dayInfo.day).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            ))}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex h-[40px] w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-white hover:bg-primary-dark"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className="mb-8">
      <label className="mb-3 block text-base font-medium text-dark dark:text-white">
        Select Delivery Date {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="h-12 w-full rounded-lg border border-stroke bg-white pl-12 pr-4 text-left text-dark outline-hidden focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        >
          {formatDisplayDate(selectedDate)}
        </button>
        <span className="pointer-events-none absolute inset-y-0 flex h-12 w-12 items-center justify-center text-dark-5">
          <svg
            width="21"
            height="20"
            viewBox="0 0 21 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 3.3125H16.3125V2.625C16.3125 2.25 16 1.90625 15.5937 1.90625C15.1875 1.90625 14.875 2.21875 14.875 2.625V3.28125H6.09375V2.625C6.09375 2.25 5.78125 1.90625 5.375 1.90625C4.96875 1.90625 4.65625 2.21875 4.65625 2.625V3.28125H3C1.9375 3.28125 1.03125 4.15625 1.03125 5.25V16.125C1.03125 17.1875 1.90625 18.0938 3 18.0938H18C19.0625 18.0938 19.9687 17.2187 19.9687 16.125V5.25C19.9687 4.1875 19.0625 3.3125 18 3.3125ZM3 4.71875H4.6875V5.34375C4.6875 5.71875 5 6.0625 5.40625 6.0625C5.8125 6.0625 6.125 5.75 6.125 5.34375V4.71875H14.9687V5.34375C14.9687 5.71875 15.2812 6.0625 15.6875 6.0625C16.0937 6.0625 16.4062 5.75 16.4062 5.34375V4.71875H18C18.3125 18.71875 18.5625 4.96875 18.5625 5.28125V7.34375H2.46875V5.28125C2.46875 4.9375 2.6875 4.71875 3 4.71875ZM18 16.6562H3C2.6875 16.6562 2.4375 16.4062 2.4375 16.0937V8.71875H18.5312V16.125C18.5625 16.4375 18.3125 16.6562 18 16.6562Z"
              fill="currentColor"
            />
          </svg>
        </span>

        {isOpen && (
          <div className="absolute bottom-full left-0 z-50 mb-2 flex w-[340px] flex-col rounded-xl bg-white p-3 shadow-four dark:bg-dark-2 dark:shadow-box-dark sm:p-4">
            <div className="flex items-center justify-between pb-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-[7px] border-[.5px] border-stroke bg-gray-2 text-dark hover:border-primary hover:bg-primary hover:text-white dark:border-dark-3 dark:bg-dark dark:text-white"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="fill-current"
                >
                  <path d="M16.2375 21.4875C16.0125 21.4875 15.7875 21.4125 15.6375 21.225L7.16249 12.6C6.82499 12.2625 6.82499 11.7375 7.16249 11.4L15.6375 2.77498C15.975 2.43748 16.5 2.43748 16.8375 2.77498C17.175 3.11248 17.175 3.63748 16.8375 3.97498L8.96249 12L16.875 20.025C17.2125 20.3625 17.2125 20.8875 16.875 21.225C16.65 21.375 16.4625 21.4875 16.2375 21.4875Z" />
                </svg>
              </button>
              <span className="text-base font-medium capitalize text-dark dark:text-white">
                {monthYearDisplay}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-[7px] border-[.5px] border-stroke bg-gray-2 text-dark hover:border-primary hover:bg-primary hover:text-white dark:border-dark-3 dark:bg-dark dark:text-white"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="fill-current"
                >
                  <path d="M7.7625 21.4875C7.5375 21.4875 7.35 21.4125 7.1625 21.2625C6.825 20.925 6.825 20.4 7.1625 20.0625L15.0375 12L7.1625 3.97498C6.825 3.63748 6.825 3.11248 7.1625 2.77498C7.5 2.43748 8.025 2.43748 8.3625 2.77498L16.8375 11.4C17.175 11.7375 17.175 12.2625 16.8375 12.6L8.3625 21.225C8.2125 21.375 7.9875 21.4875 7.7625 21.4875Z" />
                </svg>
              </button>
            </div>

            <div className="flex justify-between pb-1.5 pt-2 text-xs font-medium capitalize text-body-color dark:text-dark-6">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                <span key={day} className="flex h-[32px] w-[32px] items-center justify-center">
                  {day}
                </span>
              ))}
            </div>

            {[0, 1, 2, 3, 4, 5].map((week) => (
              <div key={week} className="flex justify-between pb-1.5 text-sm font-medium">
                {days.slice(week * 7, week * 7 + 7).map((dayInfo, index) => {
                  // Empty cell - render invisible placeholder
                  if (dayInfo.isEmpty) {
                    return (
                      <div
                        key={index}
                        className="flex h-[32px] w-[32px] items-center justify-center"
                      />
                    );
                  }

                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const checkDate = new Date(dayInfo.date);
                  checkDate.setHours(0, 0, 0, 0);
                  const isToday = checkDate.getTime() === today.getTime();

                  const isAvailable = dayInfo.isCurrentMonth && isDateAvailable(dayInfo.date);
                  const isSelected = selectedDate === dayInfo.date.toISOString().split('T')[0];
                  const isPastOrDisabled = !isAvailable;

                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={isPastOrDisabled}
                      onClick={() => handleDateClick(dayInfo.date)}
                      className={`flex h-[32px] w-[32px] items-center justify-center rounded-[7px] border-[.5px] ${
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : isToday
                          ? 'border-primary bg-primary/10 text-primary dark:border-primary dark:bg-primary/20'
                          : isPastOrDisabled
                          ? 'border-transparent text-body-color opacity-40 cursor-not-allowed dark:text-dark-6'
                          : 'border-transparent text-dark hover:border-stroke hover:bg-gray-2 dark:text-white dark:hover:border-dark-3 dark:hover:bg-dark cursor-pointer'
                      }`}
                    >
                      {String(dayInfo.day).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            ))}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-[40px] w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-white hover:bg-primary-dark"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

DeliveryDatePicker.propTypes = {
  selectedDate: PropTypes.string,
  onDateChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  variant: PropTypes.oneOf(["default", "compact"]),
};

export default DeliveryDatePicker;
