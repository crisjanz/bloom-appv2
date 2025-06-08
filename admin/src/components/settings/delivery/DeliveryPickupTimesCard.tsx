import { useState, useEffect } from "react";
import ComponentCardCollapsible from "../../common/ComponentCardCollapsible";
import Button from "../../ui/button/Button";
import { TimeIcon, CalenderIcon, TruckIcon, SettingsIcon } from "../../../icons";

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

const DeliveryPickupTimesCard = () => {
  const [exceptions, setExceptions] = useState<DeliveryException[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [businessHoursRes, exceptionsRes] = await Promise.all([
        fetch('/api/settings/business-hours'),
        fetch('/api/settings/delivery-exceptions')
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

  const calendarDays = generateCalendarDays();
  const today = new Date().toISOString().split('T')[0];

  const toggleDate = (dateString: string) => {
    if (dateString < today) return;

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
            <TimeIcon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-white">
              Delivery Schedule
            </h3>
          </div>
          
          {/* Regular Business Hours */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Delivery & pickup follow your business hours:
            </p>
            <div className="space-y-2">
              {Object.entries(businessHours).map(([day, hours]) => (
                <div key={day} className="flex justify-between items-center py-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {day}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {hours.enabled ? (
                      `${formatTime(hours.open)} - ${formatTime(hours.close)}`
                    ) : (
                      <span className="text-red-500">Closed</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  To change delivery hours, update Business Hours settings
                </p>
              </div>
            </div>
          </div>

          {/* Holiday Hours */}
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalenderIcon className="w-5 h-5 text-orange-600" />
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Upcoming Holiday Hours:
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-orange-700 dark:text-orange-300">
                  Christmas Day (Dec 25)
                </span>
                <span className="text-sm text-red-500 font-medium">
                  Closed
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-orange-700 dark:text-orange-300">
                  New Year's Day (Jan 1)
                </span>
                <span className="text-sm text-red-500 font-medium">
                  Closed
                </span>
              </div>
            </div>
            
            <div className="mt-3 p-2 bg-orange-100 dark:bg-orange-800/30 rounded border border-orange-200 dark:border-orange-700">
              <div className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  Manage holiday hours in Holidays settings
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Delivery Exceptions */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TruckIcon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-white">
              Delivery & Pickup Exceptions
            </h3>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click dates to cycle through restriction modes:
            </p>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>No Delivery + Pickup</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>No Delivery</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>No Pickup</span>
              </div>
            </div>

            {/* Calendar */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              {/* Calendar Header */}
              <div className="flex justify-between items-center mb-3">
                <button
                  onClick={previousMonth}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  ←
                </button>
                <h4 className="font-medium text-gray-800 dark:text-white text-sm">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h4>
                <button
                  onClick={nextMonth}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  →
                </button>
              </div>

              {/* Calendar Grid - Fixed keys */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <div key={`day-header-${index}`} className="p-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
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
                  const isBusinessClosed = businessDay && !businessDay.enabled;
                  const exception = getExceptionStatus(dateString);
                  
                  let buttonClass = 'p-1.5 text-xs rounded transition-colors aspect-square ';
                  let buttonTitle = '';
                  
                  if (!isCurrentMonth) {
                    buttonClass += 'text-gray-300 dark:text-gray-600';
                  } else if (isPast) {
                    buttonClass += 'text-gray-300 dark:text-gray-600 cursor-not-allowed';
                  } else if (isBusinessClosed) {
                    buttonClass += 'bg-gray-400 text-white cursor-not-allowed';
                    buttonTitle = 'Business closed';
                  } else if (exception) {
                    if (exception.noDelivery && exception.noPickup) {
                      buttonClass += 'bg-red-500 text-white font-medium';
                      buttonTitle = 'No delivery + pickup';
                    } else if (exception.noDelivery) {
                      buttonClass += 'bg-yellow-500 text-white font-medium';
                      buttonTitle = 'No delivery';
                    } else if (exception.noPickup) {
                      buttonClass += 'bg-blue-500 text-white font-medium';
                      buttonTitle = 'No pickup';
                    }
                  } else if (isToday) {
                    buttonClass += 'bg-yellow-100 dark:bg-yellow-900/30 font-medium';
                    buttonTitle = 'Today';
                  } else {
                    buttonClass += 'hover:bg-gray-100 dark:hover:bg-gray-700';
                  }
                  
                  return (
                    <button
                      key={`calendar-day-${index}`}
                      onClick={() => !isPast && isCurrentMonth && !isBusinessClosed && toggleDate(dateString)}
                      disabled={isPast || !isCurrentMonth || isBusinessClosed}
                      className={buttonClass}
                      title={buttonTitle}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Exceptions Display - Simplified with colored badges */}
            {exceptions.length > 0 && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Exceptions:
                </p>
                <div className="flex flex-wrap gap-2">
                  {exceptions.map(exception => {
                    let badgeClass = "inline-flex items-center gap-1 px-2 py-1 rounded text-xs ";
                    if (exception.noDelivery && exception.noPickup) {
                      badgeClass += "bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200";
                    } else if (exception.noDelivery) {
                      badgeClass += "bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-200";
                    } else if (exception.noPickup) {
                      badgeClass += "bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200";
                    }
                    
                    return (
                      <span key={exception.date} className={badgeClass}>
                        {new Date(exception.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        <button
                          onClick={() => toggleDate(exception.date)}
                          className="hover:bg-opacity-20 hover:bg-black rounded px-1"
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
      <div className="mt-8 flex justify-between">
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
          className="bg-primary hover:bg-primary/90 text-white px-6 py-2"
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