import { useState, useEffect } from "react";
import ComponentCardCollapsible from "@shared/ui/common/ComponentCardCollapsible";
import Button from "@shared/ui/components/ui/button/Button";
import { TimeIcon, CalenderIcon, TruckIcon, SettingsIcon, CloseIcon, CheckLineIcon } from "@shared/assets/icons";

interface BusinessHours {
  [key: string]: {
    enabled: boolean;
    open: string;
    close: string;
  };
}

interface DeliveryException {
  date: string;
  noDelivery: boolean;
  noPickup: boolean;
  reason?: string;
}

interface Holiday {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  color: string;
  notes?: string;
}

const DeliveryPickupTimesCard = () => {
  const [exceptions, setExceptions] = useState<DeliveryException[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours>({});
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [businessHoursRes, exceptionsRes, holidaysRes] = await Promise.all([
        fetch('/api/settings/business-hours'),
        fetch('/api/settings/delivery-exceptions'),
        fetch('/api/settings/holidays')
      ]);

      if (businessHoursRes.ok) {
        const hoursData = await businessHoursRes.json();
        setBusinessHours({
          monday: { enabled: hoursData.mondayEnabled, open: hoursData.mondayOpen, close: hoursData.mondayClose },
          tuesday: { enabled: hoursData.tuesdayEnabled, open: hoursData.tuesdayOpen, close: hoursData.tuesdayClose },
          wednesday: { enabled: hoursData.wednesdayEnabled, open: hoursData.wednesdayOpen, close: hoursData.wednesdayClose },
          thursday: { enabled: hoursData.thursdayEnabled, open: hoursData.thursdayOpen, close: hoursData.thursdayClose },
          friday: { enabled: hoursData.fridayEnabled, open: hoursData.fridayOpen, close: hoursData.fridayClose },
          saturday: { enabled: hoursData.saturdayEnabled, open: hoursData.saturdayOpen, close: hoursData.saturdayClose },
          sunday: { enabled: hoursData.sundayEnabled, open: hoursData.sundayOpen, close: hoursData.sundayClose },
        });
      }

      if (exceptionsRes.ok) {
        const exceptionsData = await exceptionsRes.json();
        if (exceptionsData.customClosureDates && Array.isArray(exceptionsData.customClosureDates)) {
          setExceptions(
            exceptionsData.customClosureDates.map((date: string) => ({
              date,
              noDelivery: true,
              noPickup: true,
            }))
          );
        } else {
          setExceptions(exceptionsData.exceptions || []);
        }
      }

      if (holidaysRes.ok) {
        const holidaysData = await holidaysRes.json();
        setHolidays(holidaysData.holidays || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/delivery-exceptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exceptions: exceptions,
          notes: ""
        }),
      });

      if (response.ok) {
        console.log('Delivery exceptions saved successfully');
        await loadData();
      } else {
        console.error('Failed to save delivery exceptions');
      }
    } catch (error) {
      console.error('Error saving delivery exceptions:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  // Check if a date falls within any holiday period
  const getHolidayForDate = (dateString: string): Holiday | null => {
    return holidays.find(holiday => {
      return dateString >= holiday.startDate && dateString <= holiday.endDate;
    }) || null;
  };

  // Get upcoming holidays (next 30 days)
  const getUpcomingHolidays = () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    return holidays.filter(holiday => {
      const holidayStart = new Date(holiday.startDate + 'T00:00:00');
      return holidayStart >= today && holidayStart <= thirtyDaysFromNow;
    }).sort((a, b) => a.startDate.localeCompare(b.startDate));
  };

  const calendarDays = generateCalendarDays();
  const today = new Date().toISOString().split('T')[0];
  const upcomingHolidays = getUpcomingHolidays();

  const toggleDate = (dateString: string) => {
    if (dateString < today) return;

    // Don't allow manual exceptions on holiday dates
    const holiday = getHolidayForDate(dateString);
    if (holiday) return;

    setExceptions(prev => {
      const existing = prev.find(ex => ex.date === dateString);
      const newExceptions = prev.filter(ex => ex.date !== dateString);
      
      if (!existing) {
        return [...newExceptions, { date: dateString, noDelivery: true, noPickup: true }];
      } else if (existing.noDelivery && existing.noPickup) {
        return [...newExceptions, { date: dateString, noDelivery: true, noPickup: false }];
      } else if (existing.noDelivery && !existing.noPickup) {
        return [...newExceptions, { date: dateString, noDelivery: false, noPickup: true }];
      } else {
        return newExceptions;
      }
    });
  };

  const clearAllExceptions = () => {
    setExceptions([]);
  };

  const getExceptionStatus = (dateString: string) => {
    return exceptions.find(ex => ex.date === dateString);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    
    if (startDate === endDate) {
      return start.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: start.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      });
    } else {
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
  };

  if (isLoading) {
    return (
      <ComponentCardCollapsible title="Delivery & Pickup Times" desc="Delivery schedule and closure exceptions">
        <div className="animate-pulse">Loading delivery settings...</div>
      </ComponentCardCollapsible>
    );
  }

  return (
    <ComponentCardCollapsible 
      title="Delivery & Pickup Times" 
      desc="Delivery schedule and closure exceptions"
      defaultOpen={false}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN - Business Hours Reference */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TimeIcon className="w-5 h-5" style={{ color: 'brand-500' }} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Delivery Schedule
            </h3>
          </div>
          
          {/* Regular Business Hours */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Delivery & pickup follow your business hours:
            </p>
            <div className="space-y-2">
              {Object.entries(businessHours).map(([day, hours]) => (
                <div key={day} className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                  <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {day}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">
                    {hours.enabled ? (
                      `${formatTime(hours.open)} - ${formatTime(hours.close)}`
                    ) : (
                      <span className="text-gray-500">Closed</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-gray-500" />
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  To change delivery hours, update Business Hours settings
                </p>
              </div>
            </div>
          </div>

          {/* Holiday Hours */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalenderIcon className="w-5 h-5" style={{ color: 'brand-500' }} />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Upcoming Holiday Hours:
              </p>
            </div>
            
            {upcomingHolidays.length > 0 ? (
              <div className="space-y-2">
                {upcomingHolidays.map(holiday => (
                  <div key={holiday.id} className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {holiday.name} ({formatDateRange(holiday.startDate, holiday.endDate)})
                    </span>
                    <div className="flex items-center gap-2">
                      {holiday.isOpen ? (
                        <>
                          <CheckLineIcon className="w-3 h-3 text-gray-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatTime(holiday.openTime || '')} - {formatTime(holiday.closeTime || '')}
                          </span>
                        </>
                      ) : (
                        <>
                          <CloseIcon className="w-3 h-3 text-gray-500" />
                          <span className="text-sm text-gray-500">
                            Closed
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No upcoming holidays configured
              </p>
            )}
            
            <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-gray-500" />
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Manage holiday hours in Holidays settings
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Delivery Exceptions */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TruckIcon className="w-5 h-5" style={{ color: 'brand-500' }} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Delivery & Pickup Exceptions
            </h3>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click dates to cycle through restriction modes. Holiday dates are automatically applied.
            </p>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-gray-400 rounded"></div>
                  <span className="text-gray-600 dark:text-gray-400">No Delivery + Pickup</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-gray-400 bg-gray-200 dark:bg-gray-600 rounded"></div>
                  <span className="text-gray-600 dark:text-gray-400">No Delivery</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <span className="text-gray-600 dark:text-gray-400">No Pickup</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-l-2 bg-gray-100 dark:bg-gray-700 rounded" style={{ borderLeftColor: 'brand-500' }}></div>
                  <span className="text-gray-600 dark:text-gray-400">Holiday</span>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              {/* Calendar Header */}
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={previousMonth}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"
                >
                  ←
                </button>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h4>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"
                >
                  →
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <div key={`day-header-${index}`} className="p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const dateString = day.toISOString().split('T')[0];
                  const dayOfWeek = day.getDay();
                  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                  const businessDay = businessHours[dayNames[dayOfWeek]];
                  
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const isPast = dateString < today;
                  const isToday = dateString === today;
                  const holiday = getHolidayForDate(dateString);
                  const exception = getExceptionStatus(dateString);
                  
                  let buttonClass = 'p-2 text-xs rounded transition-all aspect-square flex items-center justify-center border ';
                  let buttonTitle = '';
                  let isClickable = isCurrentMonth && !isPast;
                  
                  if (!isCurrentMonth) {
                    buttonClass += 'text-gray-300 dark:text-gray-600 border-transparent';
                    isClickable = false;
                  } else if (isPast) {
                    buttonClass += 'text-gray-300 dark:text-gray-600 border-transparent cursor-not-allowed';
                    isClickable = false;
                  } else if (holiday) {
                    // Holiday takes precedence over everything
                    if (holiday.isOpen) {
                      buttonClass += 'border-l-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-medium';
                      buttonClass += ' border-l-brand-500 border-t-gray-200 border-r-gray-200 border-b-gray-200 dark:border-t-gray-600 dark:border-r-gray-600 dark:border-b-gray-600';
                      buttonTitle = `${holiday.name} - Open ${formatTime(holiday.openTime || '')} - ${formatTime(holiday.closeTime || '')}`;
                    } else {
                      buttonClass += 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium border-gray-300 dark:border-gray-600';
                      buttonTitle = `${holiday.name} - Closed`;
                    }
                    isClickable = false;
                  } else if (exception) {
                    // Manual exceptions
                    if (exception.noDelivery && exception.noPickup) {
                      buttonClass += 'border-2 border-gray-400 dark:border-gray-500 text-gray-700 dark:text-gray-300 font-medium';
                      buttonTitle = 'No delivery + pickup';
                    } else if (exception.noDelivery) {
                      buttonClass += 'border border-gray-400 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium';
                      buttonTitle = 'No delivery';
                    } else if (exception.noPickup) {
                      buttonClass += 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium border-gray-300 dark:border-gray-600';
                      buttonTitle = 'No pickup';
                    }
                  } else if (businessDay && !businessDay.enabled) {
                    // Business closed (but can be overridden with manual exceptions)
                    buttonClass += 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700';
                    buttonTitle = 'Business closed - click to allow delivery/pickup';
                  } else if (isToday) {
                    buttonClass += 'bg-gray-100 dark:bg-gray-800 font-medium text-gray-900 dark:text-white border-gray-300 dark:border-gray-600';
                    buttonTitle = 'Today';
                  } else {
                    buttonClass += 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
                  }
                  
                  return (
                    <button
                      key={`calendar-day-${index}`}
                      onClick={() => isClickable && toggleDate(dateString)}
                      disabled={!isClickable}
                      className={buttonClass}
                      title={buttonTitle}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Exceptions Display */}
            {exceptions.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Manual Exceptions:
                </p>
                <div className="flex flex-wrap gap-2">
                  {exceptions.map(exception => {
                    let badgeClass = "inline-flex items-center gap-2 px-3 py-1.5 rounded border text-sm ";
                    let statusIcon = null;
                    
                    if (exception.noDelivery && exception.noPickup) {
                      badgeClass += "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300";
                      statusIcon = <span className="w-2 h-2 border-2 border-gray-400 rounded-full"></span>;
                    } else if (exception.noDelivery) {
                      badgeClass += "border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
                      statusIcon = <span className="w-2 h-2 border border-gray-400 bg-gray-300 rounded-full"></span>;
                    } else if (exception.noPickup) {
                      badgeClass += "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300";
                      statusIcon = <span className="w-2 h-2 bg-gray-400 rounded-full"></span>;
                    }
                    
                    return (
                      <span key={exception.date} className={badgeClass}>
                        {statusIcon}
                        {new Date(exception.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        <button
                          onClick={() => setExceptions(prev => prev.filter(ex => ex.date !== exception.date))}
                          className="hover:bg-gray-200 dark:hover:bg-gray-600 rounded p-0.5 text-gray-500"
                          title="Remove exception"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Save Button Row */}
            <div className="flex justify-between pt-4">
              <Button
                onClick={clearAllExceptions}
                disabled={exceptions.length === 0}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 text-sm"
              >
                Clear All
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2"
                style={{ backgroundColor: 'brand-500' }}
              >
                {isSaving ? 'Saving...' : 'Save Exceptions'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ComponentCardCollapsible>
  );
};

export default DeliveryPickupTimesCard;