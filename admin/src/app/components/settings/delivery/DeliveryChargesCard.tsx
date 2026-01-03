import { useState, useEffect } from "react";
import ComponentCardCollapsible from "@shared/ui/common/ComponentCardCollapsible";
import InputField from "@shared/ui/forms/input/InputField";
import Label from "@shared/ui/forms/Label";
import Select from "@shared/ui/forms/Select";
import Button from "@shared/ui/components/ui/button/Button";
import AddressAutocomplete from "@shared/ui/forms/AddressAutocomplete";
import { TruckIcon, PlusIcon, TrashBinIcon, PencilIcon, SettingsIcon } from "@shared/assets/icons";

interface DeliveryZone {
  id?: string;
  name: string;
  minDistance: number;
  maxDistance: number | null;
  fee: number;
  enabled: boolean;
}

interface DeliverySettings {
  id?: string;
  storeAddress: string;
  storePostalCode: string;
  storeLatitude?: number;
  storeLongitude?: number;
  deliveryMode: string;
  freeDeliveryMinimum?: number;
  maxDeliveryRadius?: number;
  enabled: boolean;
  businessHoursOnly: boolean;
  advanceOrderHours: number;
}

const normalizeMoneyFromApi = (value?: number | null): number | undefined => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  if (value >= 100) {
    return value / 100;
  }

  return value;
};

const toCents = (value?: number): number | undefined => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  return Math.round(value * 100);
};

const DeliveryChargesCard = () => {
  const [settings, setSettings] = useState<DeliverySettings>({
    storeAddress: "",
    storePostalCode: "",
    deliveryMode: "DISTANCE",
    freeDeliveryMinimum: undefined,
    maxDeliveryRadius: undefined,
    enabled: true,
    businessHoursOnly: true,
    advanceOrderHours: 2,
  });
  
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [testAddress, setTestAddress] = useState("");
  const [testResult, setTestResult] = useState<{ zone: string; fee: number; distance: number } | null>(null);

  // New zone form
  const [newZone, setNewZone] = useState<DeliveryZone>({
    name: "",
    minDistance: 0,
    maxDistance: null,
    fee: 0,
    enabled: true,
  });

  const deliveryModeOptions = [
    { value: "DISTANCE", label: "Distance-Based Zones" },
    { value: "POSTAL_CODE", label: "Postal Code Zones (Coming Soon)" },
    { value: "REGION", label: "Region-Based Zones (Coming Soon)" },
  ];

  useEffect(() => {
    loadDeliveryCharges();
  }, []);

  const loadDeliveryCharges = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/delivery-charges');
      if (response.ok) {
        const data = await response.json();
        const rawSettings = data.settings || {};
        setSettings((prev) => ({
          ...prev,
          ...rawSettings,
          freeDeliveryMinimum: normalizeMoneyFromApi(rawSettings.freeDeliveryMinimum)
        }));
        setZones(
          (data.zones || []).map((zone: DeliveryZone) => ({
            ...zone,
            fee: normalizeMoneyFromApi(zone.fee) ?? 0
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load delivery charges:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payloadSettings = {
        ...settings,
        freeDeliveryMinimum: toCents(settings.freeDeliveryMinimum)
      };
      const payloadZones = zones
        .filter(zone => zone.name && zone.fee >= 0)
        .map(zone => ({
          ...zone,
          fee: toCents(zone.fee) ?? 0
        }));

      const response = await fetch('/api/settings/delivery-charges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: payloadSettings,
          zones: payloadZones // Only save valid zones
        }),
      });

      if (response.ok) {
        console.log('Delivery charges saved successfully');
        await loadDeliveryCharges();
      } else {
        console.error('Failed to save delivery charges');
      }
    } catch (error) {
      console.error('Error saving delivery charges:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingChange = (field: keyof DeliverySettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddZone = () => {
    if (!newZone.name || newZone.fee < 0) return;
    
    const zone: DeliveryZone = {
      ...newZone,
      id: `temp-${Date.now()}`, // Temporary ID
    };
    
    setZones(prev => [...prev, zone].sort((a, b) => a.minDistance - b.minDistance));
    setNewZone({
      name: "",
      minDistance: 0,
      maxDistance: null,
      fee: 0,
      enabled: true,
    });
  };

  const handleEditZone = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setNewZone(zone);
  };

  const handleUpdateZone = () => {
    if (!editingZone || !newZone.name || newZone.fee < 0) return;
    
    setZones(prev => 
      prev.map(zone => 
        zone.id === editingZone.id ? { ...newZone, id: editingZone.id } : zone
      ).sort((a, b) => a.minDistance - b.minDistance)
    );
    
    setEditingZone(null);
    setNewZone({
      name: "",
      minDistance: 0,
      maxDistance: null,
      fee: 0,
      enabled: true,
    });
  };

  const handleDeleteZone = (zoneId: string) => {
    if (confirm('Are you sure you want to delete this delivery zone?')) {
      setZones(prev => prev.filter(zone => zone.id !== zoneId));
    }
  };

  const formatDistance = (distance: number | null) => {
    if (distance === null) return "∞";
    return `${distance}km`;
  };

  const testDeliveryFee = async () => {
    if (!testAddress) return;
    
    try {
      // This would use your calculateDeliveryFee function
      // For now, let's simulate it
      const mockDistance = Math.random() * 20; // 0-20km
console.log("🎯 Test distance calculated:", mockDistance); 
      const applicableZone = zones.find(zone => 
        mockDistance >= zone.minDistance && 
        (zone.maxDistance === null || mockDistance < zone.maxDistance) &&
        zone.enabled
      );
      
      if (applicableZone) {
        setTestResult({
          zone: applicableZone.name,
          fee: applicableZone.fee,
          distance: mockDistance
        });
      } else {
        setTestResult(null);
      }
    } catch (error) {
      console.error('Error testing delivery fee:', error);
    }
  };

  if (isLoading) {
    return (
      <ComponentCardCollapsible title="Delivery Charges" desc="Configure delivery zones and pricing">
        <div className="animate-pulse">Loading delivery charges...</div>
      </ComponentCardCollapsible>
    );
  }

  return (
    <ComponentCardCollapsible 
      title="Delivery Charges" 
      desc="Configure delivery zones and pricing"
      defaultOpen={false}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN - Settings */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <SettingsIcon className="w-5 h-5" style={{ color: 'brand-500' }} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Delivery Settings
            </h3>
          </div>

          <div className="space-y-6">
            {/* Store Location */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Store Location</h4>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="storeAddress">Store Address</Label>
                  <AddressAutocomplete
                    id="storeAddress"
                    value={settings.storeAddress}
                    onChange={(value) => handleSettingChange('storeAddress', value)}
                    onAddressSelect={(parsedAddress) => {
                      // Save the complete address for Google Maps distance calculations
                      const fullAddress = [
                        parsedAddress.address1,
                        parsedAddress.city,
                        parsedAddress.province,
                        parsedAddress.country || 'Canada'
                      ].filter(Boolean).join(', ');
                      
                      handleSettingChange('storeAddress', fullAddress);
                      handleSettingChange('storePostalCode', parsedAddress.postalCode);
                      // You could also save lat/lng here for more precise calculations
                    }}
                    placeholder="Enter your store address"
                  />
                </div>

                <div>
                  <Label htmlFor="storePostalCode">Store Postal Code</Label>
                  <InputField
                    type="text"
                    id="storePostalCode"
                    value={settings.storePostalCode}
                    onChange={(e) => handleSettingChange('storePostalCode', e.target.value)}
                    placeholder="V6B 1A1"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Options */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Delivery Options</h4>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="deliveryMode">Delivery Mode</Label>
                  <Select
                    options={deliveryModeOptions}
                    value={settings.deliveryMode}
                    onChange={(value) => handleSettingChange('deliveryMode', value)}
                    disabled={settings.deliveryMode !== "DISTANCE"} // Only distance mode for now
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="freeDeliveryMin">Free Delivery Minimum ($)</Label>
                    <InputField
                      type="number"
                      id="freeDeliveryMin"
                      value={settings.freeDeliveryMinimum?.toString() || ""}
                      onChange={(e) => handleSettingChange('freeDeliveryMinimum', parseFloat(e.target.value) || undefined)}
                      placeholder="50.00"
                      min="0"
                      step={0.01}
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxRadius">Max Delivery Radius (km)</Label>
                    <InputField
                      type="number"
                      id="maxRadius"
                      value={settings.maxDeliveryRadius?.toString() || ""}
                      onChange={(e) => handleSettingChange('maxDeliveryRadius', parseFloat(e.target.value) || undefined)}
                      placeholder="25"
                      min="0"
                      step={0.1}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="advanceHours">Advance Order Hours</Label>
                  <InputField
                    type="number"
                    id="advanceHours"
                    value={settings.advanceOrderHours.toString()}
                    onChange={(e) => handleSettingChange('advanceOrderHours', parseInt(e.target.value) || 2)}
                    min="0"
                    max="48"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum hours required for advance orders</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={settings.enabled}
                    onChange={(e) => handleSettingChange('enabled', e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="enabled" className="mb-0">Enable Delivery Service</Label>
                </div>
              </div>
            </div>

            {/* Test Address */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Test Delivery Fee</h4>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="testAddress">Test Address</Label>
                  <div className="flex gap-2">
                    <InputField
                      type="text"
                      id="testAddress"
                      value={testAddress}
                      onChange={(e) => setTestAddress(e.target.value)}
                      placeholder="Enter address to test"
                      className="flex-1"
                    />
                    <Button
                      onClick={testDeliveryFee}
                      disabled={!testAddress}
                      className="px-4 py-2 text-sm"
                      style={{ backgroundColor: 'brand-500' }}
                    >
                      Test
                    </Button>
                  </div>
                </div>

                {testResult && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                    <p className="text-sm">
                      <span className="font-medium">Zone:</span> {testResult.zone}<br/>
                      <span className="font-medium">Distance:</span> {testResult.distance.toFixed(1)}km<br/>
                      <span className="font-medium">Fee:</span> ${testResult.fee.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Zones Management */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <TruckIcon className="w-5 h-5" style={{ color: 'brand-500' }} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Delivery Zones
            </h3>
          </div>

          <div className="space-y-6">
            {/* Existing Zones */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Current Zones</h4>
              
              {zones.length > 0 ? (
                <div className="space-y-3">
                  {zones.map((zone, index) => (
                    <div
                      key={zone.id || index}
                      className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {zone.name}
                          </span>
                          {!zone.enabled && (
                            <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                              Disabled
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDistance(zone.minDistance)} - {formatDistance(zone.maxDistance)} • ${zone.fee.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditZone(zone)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteZone(zone.id!)}
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
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <TruckIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No delivery zones configured yet.</p>
                  <p className="text-sm">Add your first zone below.</p>
                </div>
              )}
            </div>

            {/* Add/Edit Zone Form */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                {editingZone ? 'Edit Zone' : 'Add New Zone'}
              </h4>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="zoneName">Zone Name</Label>
                  <InputField
                    type="text"
                    id="zoneName"
                    value={newZone.name}
                    onChange={(e) => setNewZone(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Downtown, Zone 1, Local Area"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minDistance">Min Distance (km)</Label>
                    <InputField
                      type="number"
                      id="minDistance"
                      value={newZone.minDistance.toString()}
                      onChange={(e) => setNewZone(prev => ({ ...prev, minDistance: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      step={0.1}
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxDistance">Max Distance (km)</Label>
                    <InputField
                      type="number"
                      id="maxDistance"
                      value={newZone.maxDistance?.toString() || ""}
                      onChange={(e) => setNewZone(prev => ({ ...prev, maxDistance: parseFloat(e.target.value) || null }))}
                      placeholder="Leave empty for unlimited"
                      min="0"
                      step={0.1}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="fee">Delivery Fee ($)</Label>
                  <InputField
                    type="number"
                    id="fee"
                    value={newZone.fee.toString()}
                    onChange={(e) => setNewZone(prev => ({ ...prev, fee: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step={0.01}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="zoneEnabled"
                    checked={newZone.enabled}
                    onChange={(e) => setNewZone(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="zoneEnabled" className="mb-0">Zone Enabled</Label>
                </div>

                <div className="flex gap-2">
                  {editingZone ? (
                    <>
                      <Button
                        onClick={handleUpdateZone}
                        disabled={!newZone.name || newZone.fee < 0}
                        className="flex-1"
                        style={{ backgroundColor: 'brand-500' }}
                      >
                        Update Zone
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingZone(null);
                          setNewZone({
                            name: "",
                            minDistance: 0,
                            maxDistance: null,
                            fee: 0,
                            enabled: true,
                          });
                        }}
                        className="px-4 bg-gray-500 hover:bg-gray-600 text-white"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handleAddZone}
                      disabled={!newZone.name || newZone.fee < 0}
                      className="w-full flex items-center justify-center gap-2"
                      style={{ backgroundColor: 'brand-500' }}
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add Zone
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-3"
          style={{ backgroundColor: 'brand-500' }}
        >
          {isSaving ? 'Saving...' : 'Save Delivery Settings'}
        </Button>
      </div>
    </ComponentCardCollapsible>
  );
};

export default DeliveryChargesCard;
