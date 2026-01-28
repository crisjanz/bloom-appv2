import { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import ComponentCard from '@shared/ui/common/ComponentCard';
import Button from '@shared/ui/components/ui/button/Button';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import { useApiClient } from '@shared/hooks/useApiClient';
import useRoutes, { Route, RouteStop } from '@shared/hooks/useRoutes';

type DeliveryOrder = {
  id: string;
  orderNumber: number;
  recipientCustomer?: { firstName?: string; lastName?: string };
  deliveryAddress?: { address1?: string; city?: string; province?: string };
  deliveryTime?: string | null;
  status?: string;
};

export default function RouteBuilderPage() {
  const { timezone, loading: tzLoading, getBusinessDateString } = useBusinessTimezone();
  const apiClient = useApiClient();

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string }>>([]);

  const { routes, setRoutes, loading: routesLoading, error: routesError, refresh, createRoute, resequenceStops, updateRoute, deleteRoute } =
    useRoutes(selectedDate);

  // Initialize date once timezone is available
  useEffect(() => {
    if (timezone && !selectedDate) {
      setSelectedDate(getBusinessDateString(new Date()));
    }
  }, [timezone, selectedDate, getBusinessDateString]);

  const fetchOrders = useCallback(async () => {
    if (!selectedDate) return;
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const { data, status } = await apiClient.get(`/api/orders/delivery?date=${selectedDate}`);
      if (status >= 400 || !data?.orders) {
        throw new Error(data?.error || 'Failed to load orders');
      }
      const deliveryOrders = Array.isArray(data.orders?.forDelivery) ? (data.orders.forDelivery as DeliveryOrder[]) : [];
      setOrders(deliveryOrders);
    } catch (err: any) {
      console.error('Failed to load orders for route builder:', err);
      setOrdersError(err?.message ?? 'Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  }, [apiClient, selectedDate]);

  const fetchDrivers = useCallback(async () => {
    try {
      const { data, status } = await apiClient.get('/api/employees');
      if (status >= 400) {
        throw new Error(data?.error || 'Failed to load drivers');
      }
      const driverList = Array.isArray(data) ? data : data?.employees;
      const filtered = (driverList || []).filter((emp: any) => emp.type === 'DRIVER');
      setDrivers(filtered.map((emp: any) => ({ id: emp.id, name: emp.name || 'Driver' })));
    } catch (err) {
      console.error('Failed to load drivers:', err);
    }
  }, [apiClient]);

  useEffect(() => {
    fetchOrders();
    fetchDrivers();
  }, [fetchOrders, fetchDrivers]);

  const assignedOrderIds = useMemo(() => {
    const ids = new Set<string>();
    routes.forEach((route) => {
      route.stops.forEach((stop) => {
        if (stop.order?.id) {
          ids.add(stop.order.id);
        }
      });
    });
    return ids;
  }, [routes]);

  const unassignedOrders = useMemo(() => {
    return orders.filter((order) => !assignedOrderIds.has(order.id));
  }, [orders, assignedOrderIds]);

  const handleCreateRoute = useCallback(async () => {
    if (!selectedDate || selectedOrderIds.size === 0) return;
    const orderIds = Array.from(selectedOrderIds);
    await createRoute({
      date: selectedDate,
      orderIds
    });
    setSelectedOrderIds(new Set());
    await refresh();
    await fetchOrders();
  }, [selectedDate, selectedOrderIds, createRoute, refresh, fetchOrders]);

  const handleDeleteRoute = useCallback(
    async (routeId: string) => {
      await deleteRoute(routeId);
      await refresh();
      await fetchOrders();
    },
    [deleteRoute, refresh, fetchOrders]
  );

  const handleAssignDriver = useCallback(
    async (routeId: string, driverId: string) => {
      await updateRoute(routeId, { driverId: driverId || null });
      await refresh();
    },
    [updateRoute, refresh]
  );

  const onDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source } = result;
      if (!destination) return;

      // Reorder within a route
      if (destination.droppableId === source.droppableId && destination.droppableId !== 'unassigned') {
        const routeId = destination.droppableId;
        const route = routes.find((r) => r.id === routeId);
        if (!route) return;
        if (source.index === destination.index) return;

        // 1. Update local state immediately (synchronous)
        const newStops = [...route.stops];
        const [moved] = newStops.splice(source.index, 1);
        newStops.splice(destination.index, 0, moved);
        const resequenced = newStops.map((s, i) => ({ ...s, sequence: i + 1 }));

        setRoutes((prev) =>
          prev.map((r) => (r.id === routeId ? { ...r, stops: resequenced } : r))
        );

        // 2. Persist to backend in background, revert on failure
        resequenceStops(routeId, resequenced.map((s) => s.id)).catch(() => {
          refresh();
        });
        return;
      }

      // Dragging unassigned into a route is not yet supported server-side
      if (source.droppableId === 'unassigned' && destination.droppableId !== 'unassigned') {
        console.warn('Moving orders into existing routes is not supported yet.');
        return;
      }
    },
    [routes, setRoutes, resequenceStops, refresh]
  );

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const renderOrderCard = (order: DeliveryOrder, index: number, draggable: boolean) => {
    const content = (
      <div className="rounded border border-stroke bg-white p-3 shadow-sm dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center justify-between">
          <span className="font-semibold">#{order.orderNumber}</span>
          {draggable ? null : (
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={selectedOrderIds.has(order.id)}
              onChange={() => toggleOrderSelection(order.id)}
            />
          )}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {order.recipientCustomer?.firstName} {order.recipientCustomer?.lastName}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {order.deliveryAddress?.address1}, {order.deliveryAddress?.city}
        </div>
        {order.deliveryTime && <div className="text-xs text-gray-500 dark:text-gray-400">Time: {order.deliveryTime}</div>}
      </div>
    );

    if (!draggable) {
      return (
        <div key={order.id} className="mb-2">
          {content}
        </div>
      );
    }

    return (
      <Draggable draggableId={order.id} index={index} key={order.id}>
        {(provided) => (
          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="mb-2">
            {content}
          </div>
        )}
      </Draggable>
    );
  };

  const renderStopCard = (stop: RouteStop, index: number) => {
    const order = stop.order;
    return (
      <Draggable draggableId={stop.id} index={index} key={stop.id}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className="mb-2 rounded border border-stroke bg-white p-3 shadow-sm dark:border-strokedark dark:bg-boxdark"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {index + 1}. #{order.orderNumber}
              </span>
              <span className="text-xs uppercase text-primary">{stop.status}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {order.recipientCustomer?.firstName} {order.recipientCustomer?.lastName}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {order.deliveryAddress?.address1}, {order.deliveryAddress?.city}
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Route Builder" />

      <ComponentCard title="Delivery Routes">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded border border-stroke bg-transparent px-4 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:text-white"
          />
          <Button
            disabled={selectedOrderIds.size === 0 || !selectedDate}
            onClick={handleCreateRoute}
            className="flex items-center gap-2"
          >
            Create New Route ({selectedOrderIds.size})
          </Button>
          {ordersLoading || routesLoading || tzLoading ? (
            <span className="text-sm text-gray-500">Loading…</span>
          ) : null}
          {ordersError && <span className="text-sm text-red-500">{ordersError}</span>}
          {routesError && <span className="text-sm text-red-500">{routesError}</span>}
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Unassigned */}
            <ComponentCard title={`Unassigned Orders (${unassignedOrders.length})`}>
              <Droppable droppableId="unassigned" isDropDisabled>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[200px]">
                    {unassignedOrders.map((order, idx) => renderOrderCard(order, idx, false))}
                    {provided.placeholder}
                    {unassignedOrders.length === 0 && (
                      <div className="text-sm text-gray-500">No unassigned delivery orders for this date.</div>
                    )}
                  </div>
                )}
              </Droppable>
            </ComponentCard>

            {/* Routes */}
            <div className="lg:col-span-2 space-y-4">
              {routes.map((route) => (
                <ComponentCard key={route.id} title={`Route ${route.routeNumber}${route.name ? ` - ${route.name}` : ''}`}>
                  <div className="mb-3 flex items-center gap-3">
                    <select
                      className="rounded border border-stroke bg-transparent px-3 py-2 text-sm dark:border-strokedark dark:text-white"
                      value={route.driver?.id || ''}
                      onChange={(e) => handleAssignDriver(route.id, e.target.value)}
                    >
                      <option value="">Unassigned Driver</option>
                      {drivers.map((driver) => (
                        <option value={driver.id} key={driver.id}>
                          {driver.name}
                        </option>
                      ))}
                    </select>
                    <Button variant="outline" onClick={() => handleDeleteRoute(route.id)}>
                      Delete
                    </Button>
                  </div>

                  <Droppable droppableId={route.id}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[120px]">
                        {route.stops.map((stop, idx) => renderStopCard(stop, idx))}
                        {provided.placeholder}
                        {route.stops.length === 0 && (
                          <div className="text-sm text-gray-500">No stops assigned.</div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </ComponentCard>
              ))}

              {routes.length === 0 && (
                <div className="rounded border border-dashed border-stroke p-6 text-sm text-gray-500">
                  No routes yet for this date. Select orders on the left and create a route.
                </div>
              )}
            </div>
          </div>
        </DragDropContext>
      </ComponentCard>
    </div>
  );
}
