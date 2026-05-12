/**
 * Facilities Page — Module 4: Co-Working Space Allocation
 * Visual floor plan showing seats, cabins, and meeting rooms.
 * Includes: Space Allocation Modal (facility managers) + Meeting Room Booking Modal.
 */
import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/lib/store';
import {
  Building2, Loader2, AlertCircle, Monitor, DoorOpen, Users,
  ChevronDown, Search, Layers, Plus, X, Calendar, CheckCircle2, Clock
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Space {
  id: string;
  name: string;
  type: string;
  floor: string;
  building: string;
  capacity: number;
  status: string;
  amenities: string[];
}

interface FacilitiesPageProps {
  onNavigate?: (path: string) => void;
}

const typeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  seat: { icon: Monitor, label: 'Seats', color: 'text-primary' },
  cabin: { icon: DoorOpen, label: 'Cabins', color: 'text-secondary' },
  meeting_room: { icon: Users, label: 'Meeting Rooms', color: 'text-tertiary' },
};

const statusColors: Record<string, string> = {
  available: 'bg-green-500/20 border-green-500/30 text-green-400',
  occupied: 'bg-primary/20 border-primary/30 text-primary',
  maintenance: 'bg-error/20 border-error/30 text-error',
  reserved: 'bg-tertiary/20 border-tertiary/30 text-tertiary',
};

// ─── Allocate Space Modal ─────────────────────────────────────────────────────
const AllocateModal: React.FC<{
  space: Space;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ space, onClose, onSuccess }) => {
  const user = useAuthStore((s) => s.user);
  const [startups, setStartups] = useState<any[]>([]);
  const [startupId, setStartupId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('startups').select('id, company_name').order('company_name').then(({ data }) => {
      setStartups(data || []);
    });
  }, []);

  const handleAllocate = async () => {
    if (!startupId) { setError('Please select a startup.'); return; }
    if (!startDate) { setError('Start date is required.'); return; }
    setLoading(true);
    setError('');

    try {
      // Insert allocation
      const { error: err } = await supabase.from('space_allocations').insert({
        tenant_id: user?.tenant_id,
        space_id: space.id,
        startup_id: startupId,
        allocated_by: user?.id,
        start_date: startDate,
        end_date: endDate || null,
        status: 'active',
        notes,
      });
      if (err) throw err;

      // Update space status to occupied
      await supabase.from('spaces').update({ status: 'occupied' }).eq('id', space.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Allocate ${space.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-on-surface-variant block mb-1.5">Assign to Startup</label>
          <select
            value={startupId}
            onChange={(e) => setStartupId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 appearance-none"
          >
            <option value="">Select startup...</option>
            {startups.map((s) => (
              <option key={s.id} value={s.id}>{s.company_name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-on-surface-variant block mb-1.5">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="text-sm font-medium text-on-surface-variant block mb-1.5">End Date (opt.)</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-on-surface-variant block mb-1.5">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this allocation..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 resize-none" rows={2} />
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <button
          onClick={handleAllocate}
          disabled={loading}
          className="gradient-btn w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {loading ? 'Allocating...' : 'Confirm Allocation'}
        </button>
      </div>
    </Modal>
  );
};

// ─── Book Meeting Room Modal ──────────────────────────────────────────────────
const BookingModal: React.FC<{
  space: Space;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ space, onClose, onSuccess }) => {
  const user = useAuthStore((s) => s.user);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('10:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBook = async () => {
    setLoading(true);
    setError('');
    try {
      const startTime = new Date(`${date}T${startHour}:00`).toISOString();
      const endTime = new Date(`${date}T${endHour}:00`).toISOString();

      if (new Date(endTime) <= new Date(startTime)) {
        setError('End time must be after start time.');
        setLoading(false);
        return;
      }

      // Check for conflicts
      const { data: conflicts } = await supabase
        .from('bookings')
        .select('id')
        .eq('space_id', space.id)
        .eq('status', 'confirmed')
        .lt('start_time', endTime)
        .gt('end_time', startTime);

      if (conflicts && conflicts.length > 0) {
        setError('This time slot is already booked. Please choose another time.');
        setLoading(false);
        return;
      }

      const { error: err } = await supabase.from('bookings').insert({
        tenant_id: user?.tenant_id,
        space_id: space.id,
        user_id: user?.id,
        title: title || `Meeting in ${space.name}`,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed',
      });
      if (err) throw err;
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  return (
    <Modal title={`Book ${space.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-white/5 rounded-xl p-3 text-xs text-on-surface-variant flex items-center gap-2">
          <Users className="w-4 h-4" /> Capacity: {space.capacity} people
        </div>
        <div>
          <label className="text-sm font-medium text-on-surface-variant block mb-1.5">Meeting Title (optional)</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Investor call, Team standup..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50" />
        </div>
        <div>
          <label className="text-sm font-medium text-on-surface-variant block mb-1.5">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-on-surface-variant block mb-1.5">Start Time</label>
            <select value={startHour} onChange={(e) => setStartHour(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 appearance-none">
              {hours.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-on-surface-variant block mb-1.5">End Time</label>
            <select value={endHour} onChange={(e) => setEndHour(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 appearance-none">
              {hours.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <button
          onClick={handleBook}
          disabled={loading}
          className="gradient-btn w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
          {loading ? 'Booking...' : 'Confirm Booking'}
        </button>
      </div>
    </Modal>
  );
};

// ─── Main FacilitiesPage ──────────────────────────────────────────────────────
export const FacilitiesPage: React.FC<FacilitiesPageProps> = ({ onNavigate }) => {
  const user = useAuthStore((s) => s.user);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [floorFilter, setFloorFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [allocateSpace, setAllocateSpace] = useState<Space | null>(null);
  const [bookSpace, setBookSpace] = useState<Space | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const canAllocate = user?.role === 'admin' || user?.role === 'facility_manager';
  const canBook = true; // All authenticated users can book meeting rooms

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('spaces')
        .select('*')
        .order('name', { ascending: true });

      if (err) throw err;
      setSpaces(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const floors = [...new Set(spaces.map((s) => s.floor))].sort();

  const filtered = spaces.filter((s) => {
    const matchFloor = floorFilter === 'all' || s.floor === floorFilter;
    const matchType = typeFilter === 'all' || s.type === typeFilter;
    const matchSearch = searchTerm === '' || s.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFloor && matchType && matchSearch;
  });

  // Stats
  const total = spaces.length;
  const available = spaces.filter((s) => s.status === 'available').length;
  const occupied = spaces.filter((s) => s.status === 'occupied').length;
  const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

  const handleSuccess = (msg: string) => {
    setSuccessMsg(msg);
    fetchSpaces();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-headline font-bold">Facility Management</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          {total} spaces across {floors.length} floors
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <p className="text-3xl font-headline font-bold">{total}</p>
          <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide mt-1">Total Spaces</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-3xl font-headline font-bold text-green-400">{available}</p>
          <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide mt-1">Available</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-3xl font-headline font-bold text-primary">{occupied}</p>
          <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide mt-1">Occupied</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-end gap-2">
            <p className="text-3xl font-headline font-bold text-gradient">{occupancyRate}%</p>
          </div>
          <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide mt-1">Occupancy Rate</p>
          <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500" style={{ width: `${occupancyRate}%` }} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search spaces..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div className="relative">
          <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl pl-11 pr-8 py-3 text-sm outline-none focus:border-primary/50 appearance-none cursor-pointer min-w-[160px]"
          >
            <option value="all">All Floors</option>
            {floors.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
        </div>
        <div className="relative">
          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl pl-11 pr-8 py-3 text-sm outline-none focus:border-primary/50 appearance-none cursor-pointer min-w-[160px]"
          >
            <option value="all">All Types</option>
            <option value="seat">Seats</option>
            <option value="cabin">Cabins</option>
            <option value="meeting_room">Meeting Rooms</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
        </div>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-sm text-error flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-sm text-green-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded border", color)} />
            <span className="text-on-surface-variant capitalize">{status}</span>
          </div>
        ))}
        {canAllocate && (
          <span className="text-on-surface-variant/60 ml-auto text-[10px]">
            Click a space to allocate or book it
          </span>
        )}
      </div>

      {/* Floor Sections */}
      {floors.map((floor) => {
        const floorSpaces = filtered.filter((s) => s.floor === floor);
        if (floorSpaces.length === 0) return null;

        return (
          <div key={floor}>
            <h3 className="font-headline text-lg font-bold mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              {floor}
              <span className="text-xs text-on-surface-variant font-normal ml-2">
                ({floorSpaces.length} spaces)
              </span>
            </h3>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
              {floorSpaces.map((space) => {
                const config = typeConfig[space.type] || typeConfig.seat;
                const SpaceIcon = config.icon;
                const statusColor = statusColors[space.status] || statusColors.available;
                const isAvailable = space.status === 'available';

                return (
                  <div
                    key={space.id}
                    onClick={() => {
                      if (!isAvailable) return;
                      if (space.type === 'meeting_room') setBookSpace(space);
                      else if (canAllocate) setAllocateSpace(space);
                    }}
                    className={cn(
                      "relative border rounded-xl p-2 text-center transition-all duration-200 group",
                      statusColor,
                      space.type === 'cabin' && "col-span-2 row-span-2 p-3",
                      space.type === 'meeting_room' && "col-span-3 row-span-2 p-4",
                      isAvailable && (space.type === 'meeting_room' || canAllocate) ? 'cursor-pointer hover:scale-105' : 'cursor-default opacity-80'
                    )}
                    title={`${space.name} | ${space.status} | Cap: ${space.capacity}`}
                  >
                    <SpaceIcon className={cn("w-4 h-4 mx-auto mb-1", config.color)} />
                    <p className="text-[10px] font-bold truncate">{space.name.replace('Seat ', '').replace('Cabin ', '').replace('Meeting Room ', '')}</p>
                    {(space.type === 'cabin' || space.type === 'meeting_room') && (
                      <p className="text-[9px] opacity-70 mt-0.5">Cap: {space.capacity}</p>
                    )}
                    {isAvailable && space.type === 'meeting_room' && (
                      <span className="text-[8px] bg-tertiary/20 text-tertiary px-1 rounded mt-0.5 block">Book</span>
                    )}
                    {isAvailable && space.type !== 'meeting_room' && canAllocate && (
                      <span className="text-[8px] bg-primary/20 text-primary px-1 rounded mt-0.5 block">Allocate</span>
                    )}

                    {/* Hover tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-surface-container-highest rounded-lg p-3 shadow-xl border border-white/10 whitespace-nowrap text-left min-w-[160px]">
                        <p className="text-xs font-bold">{space.name}</p>
                        <p className="text-[10px] text-on-surface-variant capitalize mt-1">{space.status} • {space.type.replace('_', ' ')}</p>
                        {space.amenities && space.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {space.amenities.slice(0, 4).map((a, i) => (
                              <span key={i} className="text-[9px] bg-white/5 rounded px-1.5 py-0.5">{a}</span>
                            ))}
                          </div>
                        )}
                        {isAvailable && (
                          <p className="text-[9px] text-primary mt-1">
                            {space.type === 'meeting_room' ? 'Click to book' : canAllocate ? 'Click to allocate' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Modals */}
      {allocateSpace && (
        <AllocateModal
          space={allocateSpace}
          onClose={() => setAllocateSpace(null)}
          onSuccess={() => handleSuccess(`${allocateSpace.name} allocated successfully!`)}
        />
      )}
      {bookSpace && (
        <BookingModal
          space={bookSpace}
          onClose={() => setBookSpace(null)}
          onSuccess={() => handleSuccess(`${bookSpace.name} booked successfully!`)}
        />
      )}
    </div>
  );
};

// ─── Shared Modal wrapper ──────────────────────────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <div className="relative glass-card p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="font-headline font-bold text-lg">{title}</h3>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
      </div>
      {children}
    </div>
  </div>
);
