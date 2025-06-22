import { useState, useEffect } from "react";
import ComponentCardCollapsible from "../../common/ComponentCardCollapsible";
import InputField from "../../form/input/InputField";
import Label from "../../form/Label";
import Select from "../../form/Select";
import Button from "../../ui/button/Button";
import { CalenderIcon, TrashBinIcon, PencilIcon } from "../../../icons";
import DatePicker from "../../form/date-picker";
import { useBusinessTimezone } from "../../../hooks/useBusinessTimezone";

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

const HolidaysCard = () => {
  const { formatDate: formatBusinessDate, loading: timezoneLoading } = useBusinessTimezone();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Holiday>({
    name: "",
    startDate: "",
    endDate: "",
    isOpen: false,
    openTime: "10:00",
    closeTime: "15:00",
    color: "red",
    notes: ""
  });

  const statusOptions = [
    { value: "false", label: "Closed" },
    { value: "true", label: "Open with Special Hours" },
  ];

  const colorOptions = [
    { value: "red", label: "Red" },
    { value: "green", label: "Green" },
    { value: "blue", label: "Blue" },
    { value: "purple", label: "Purple" },
    { value: "orange", label: "Orange" },
  ];

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/holidays');
      if (response.ok) {
        const data = await response.json();
        setHolidays(data.holidays || []);
      }
    } catch (error) {
      console.error('Failed to load holidays:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof Holiday, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    

    try {
      const method = editingHoliday ? 'PUT' : 'POST';
      const url = editingHoliday 
        ? `/api/settings/holidays/${editingHoliday.id}`
        : '/api/settings/holidays';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          isOpen: formData.isOpen === true || formData.isOpen === 'true',
        }),
      });

      if (response.ok) {
        await loadHolidays();
        resetForm();
      } else {
        console.error('Failed to save holiday');
      }
    } catch (error) {
      console.error('Error saving holiday:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      ...holiday,
      isOpen: holiday.isOpen,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;

    try {
      const response = await fetch(`/api/settings/holidays/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadHolidays();
      }
    } catch (error) {
      console.error('Error deleting holiday:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      startDate: "",
      endDate: "",
      isOpen: false,
      openTime: "10:00",
      closeTime: "15:00",
      color: "red",
      notes: ""
    });
    setEditingHoliday(null);
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    if (timezoneLoading) return `${startDate} - ${endDate}`;
    
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    
    if (startDate === endDate) {
      return formatBusinessDate(start, { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } else {
      return `${formatBusinessDate(start, { month: 'short', day: 'numeric' })} - ${formatBusinessDate(end, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
  };

  const getColorClass = (color: string) => {
    const colorMap = {
      red: 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200',
      green: 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200',
      blue: 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200',
      purple: 'bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200',
      orange: 'bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-200',
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.red;
  };

  if (isLoading) {
    return (
      <ComponentCardCollapsible title="Holidays & Special Hours" desc="Manage holiday closures and special opening hours">
        <div className="animate-pulse">Loading holidays...</div>
      </ComponentCardCollapsible>
    );
  }

  return (
    <ComponentCardCollapsible 
      title="Holidays & Special Hours" 
      desc="Manage holiday closures and special opening hours"
      defaultOpen={false}
    >
      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN - Holidays List */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CalenderIcon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-white">
              Current Holidays
            </h3>
          </div>

          {holidays.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {holidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getColorClass(holiday.color)}`}>
                        {holiday.name}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {formatDateRange(holiday.startDate, holiday.endDate)}
                    </div>
                    <div className="text-sm">
                      {holiday.isOpen ? (
                        <span className="text-green-600 dark:text-green-400">
                          Open {holiday.openTime} - {holiday.closeTime}
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">
                          Closed
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleEdit(holiday)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(holiday.id!)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="Delete"
                    >
                      <TrashBinIcon className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg">
              <CalenderIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No holidays configured yet.</p>
              <p className="text-sm">Use the form to add your first holiday.</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - Add/Edit Form */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
            {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Holiday Name */}
            <div>
              <Label htmlFor="name">Holiday Name</Label>
              <InputField
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g. Christmas Day, Mother's Day"
                required
              />
            </div>
{/* Date Range */}
<div className="grid grid-cols-1 gap-4">
  <DatePicker
    id="startDate"
    label="Start Date"
    placeholder="Select start date"
    defaultDate={formData.startDate}
    onChange={(selectedDates, dateStr) => {
      handleInputChange('startDate', dateStr);
      // Auto-set end date to same as start date for single day holidays
      if (!formData.endDate) {
        handleInputChange('endDate', dateStr);
      }
    }}
  />
  <DatePicker
    id="endDate"
    label="End Date"
    placeholder="Select end date"
    defaultDate={formData.endDate}
    onChange={(selectedDates, dateStr) => {
      handleInputChange('endDate', dateStr);
    }}
  />
</div>
           

            {/* Status */}
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                options={statusOptions}
                placeholder="Select Status"
                value={formData.isOpen.toString()}
                onChange={(value) => handleInputChange('isOpen', value === 'true')}
              />
            </div>

            {/* Special Hours (only if open) */}
            {formData.isOpen && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="openTime">Open Time</Label>
                  <InputField
                    type="time"
                    id="openTime"
                    value={formData.openTime || ""}
                    onChange={(e) => handleInputChange('openTime', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="closeTime">Close Time</Label>
                  <InputField
                    type="time"
                    id="closeTime"
                    value={formData.closeTime || ""}
                    onChange={(e) => handleInputChange('closeTime', e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Color */}
            <div>
              <Label htmlFor="color">Color</Label>
              <Select
                options={colorOptions}
                placeholder="Select Color"
                value={formData.color}
                onChange={(value) => handleInputChange('color', value)}
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <InputField
                type="text"
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes"
              />
            </div>

            {/* Form Actions */}
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 w-full"
              >
                {isSaving ? 'Saving...' : editingHoliday ? 'Update Holiday' : 'Add Holiday'}
              </Button>
              {editingHoliday && (
                <Button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 w-full"
                >
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </ComponentCardCollapsible>
  );
};

export default HolidaysCard;