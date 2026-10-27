import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store.js';
import { cartStore, setCart } from '../state/cart.js';
import { scheduleStore, loadSchedule, cartProductIds } from '../state/schedule.js';
import { shopStore, timezoneOf } from '../state/shop.js';
import { dateParts } from '../format.js';
import Icon from './Icon.jsx';
import './SlotPicker.css';

// Days with many slots (5-minute slots over a long day) get an hour row first.
const GROUP_FROM = 24;

const freeCount = (d) => d.slots.filter((s) => s.available).length;

export default function SlotPicker({ error = null }) {
  const cart = useStore(cartStore);
  const shop = useStore(shopStore);
  const schedule = useStore(scheduleStore);
  const timezone = timezoneOf(shop);
  const [selectedDate, setSelectedDate] = useState(cart.slot?.date || null);
  const [selectedHour, setSelectedHour] = useState(null);

  // Reload when the order type or the cart's set of products changes: a product
  // with a longer preparation time or an advance-order rule moves the first slot.
  const productsKey = cartProductIds(cart.lines).join(',');
  const previousType = useRef(null);
  useEffect(() => {
    loadSchedule(shop.orderType, { keepLoaded: previousType.current === shop.orderType });
    previousType.current = shop.orderType;
  }, [shop.orderType, productsKey]);

  const days = schedule.days;
  // pick a sensible day whenever the schedule changes
  useEffect(() => {
    const firstOpen = days.find((d) => d.isOpen && d.slots.some((s) => s.available)) || days.find((d) => d.isOpen);
    const slot = cartStore.get().slot;
    if (slot) setSelectedDate(slot.date);
    else setSelectedDate((current) => (days.some((d) => d.date === current && d.isOpen) ? current : firstOpen?.date || null));
  }, [days]);

  const day = days.find((d) => d.date === selectedDate) || null;
  const grouped = (day?.slots?.length || 0) > GROUP_FROM;
  const hours = useMemo(() => {
    if (!grouped) return [];
    const map = new Map();
    for (const s of day.slots) {
      const h = s.time.slice(0, 2);
      if (!map.has(h)) map.set(h, { hour: h, slots: [], free: 0 });
      const g = map.get(h);
      g.slots.push(s);
      if (s.available) g.free++;
    }
    return [...map.values()];
  }, [day, grouped]);

  useEffect(() => {
    if (!grouped) {
      setSelectedHour(null);
      return;
    }
    const slot = cartStore.get().slot;
    const fromSlot = slot && slot.date === day?.date ? slot.time.slice(0, 2) : null;
    setSelectedHour((current) => {
      if (fromSlot && hours.some((h) => h.hour === fromSlot)) return fromSlot;
      if (hours.some((h) => h.hour === current)) return current;
      return (hours.find((h) => h.free > 0) || hours[0])?.hour || null;
    });
  }, [day, hours, grouped]);

  const visibleSlots = grouped ? hours.find((h) => h.hour === selectedHour)?.slots || [] : day?.slots || [];
  const allClosed = !schedule.loading && days.length > 0 && !days.some((d) => d.isOpen);

  function pickSlot(s) {
    if (!s.available) return;
    setCart({ slot: { date: day.date, time: s.time, at: s.at } });
    scheduleStore.set({ lostSlot: false });
  }

  let body;
  if (schedule.error) {
    body = (
      <div className="banner banner-danger" role="alert">
        <Icon name="alert" size={18} />
        <div>
          <strong>We could not load the available times</strong>
          <span className="banner-text">{schedule.error.message}</span>
          <div>
            <button type="button" className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => loadSchedule(shop.orderType)}>Try again</button>
          </div>
        </div>
      </div>
    );
  } else if (schedule.loading && !days.length) {
    body = (
      <>
        <div className="sp-days" aria-busy="true">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skel" style={{ height: 84, minWidth: 76, borderRadius: 'var(--r-md)' }} />)}
        </div>
        <div className="sp-slots">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="skel" style={{ height: 44, borderRadius: 'var(--r-pill)' }} />)}
        </div>
      </>
    );
  } else if (allClosed) {
    body = (
      <div className="sp-empty">
        <Icon name="calendar" size={22} />
        <p>There are no available times in the coming days.</p>
      </div>
    );
  } else {
    const long = day ? dateParts(day.date, timezone).long : '';
    body = (
      <>
        <div className="sp-days" role="group" aria-label="Day">
          {days.map((d) => {
            const parts = dateParts(d.date, timezone);
            return (
              <button
                key={d.date}
                type="button"
                className={`sp-day${d.date === selectedDate ? ' active' : ''}`}
                disabled={!d.isOpen}
                aria-pressed={d.date === selectedDate}
                aria-label={`${parts.long}${d.isOpen ? '' : ', closed'}`}
                onClick={() => d.isOpen && setSelectedDate(d.date)}
              >
                <span className="sp-day-wd">{parts.relative || parts.weekday}</span>
                <span className="sp-day-n tabular">{parts.day}</span>
                <span className="sp-day-m">{d.isOpen ? parts.month : 'Closed'}</span>
              </button>
            );
          })}
        </div>
        {day && (
          <div className={schedule.loading ? 'is-refreshing' : undefined}>
            <p className="sp-day-title">
              {long} <span className="muted">({freeCount(day)} {freeCount(day) === 1 ? 'time' : 'times'} available)</span>
            </p>
            {grouped && (
              <div className="sp-hours" role="group" aria-label="Hour">
                {hours.map((h) => (
                  <button
                    key={h.hour}
                    type="button"
                    className={`sp-hour tabular${h.hour === selectedHour ? ' active' : ''}${cart.slot?.date === day.date && cart.slot?.time.startsWith(h.hour) ? ' picked' : ''}`}
                    disabled={!h.free}
                    aria-pressed={h.hour === selectedHour}
                    aria-label={`Show the times from ${h.hour}:00`}
                    onClick={() => setSelectedHour(h.hour)}
                  >
                    {h.hour}:00
                  </button>
                ))}
              </div>
            )}
            {day.slots.length ? (
              <div className="sp-slots" role="group" aria-label={`Times on ${long}`}>
                {visibleSlots.map((s) => (
                  <button
                    key={s.at}
                    type="button"
                    className={`sp-slot tabular${cart.slot?.at === s.at ? ' active' : ''}`}
                    disabled={!s.available}
                    aria-pressed={cart.slot?.at === s.at}
                    aria-label={`${s.time}${s.available ? '' : ', full'}`}
                    onClick={() => pickSlot(s)}
                  >
                    {s.time}
                    {!s.available && <span className="sp-full">Full</span>}
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">No times left on this day.</p>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="sp">
      {schedule.lostSlot && (
        <div className="banner banner-warning sp-banner" role="status">
          <Icon name="clock" size={18} />
          <div>
            <strong>Your chosen time is no longer available</strong>
            <span className="banner-text">Please pick another time below.</span>
          </div>
        </div>
      )}
      {body}
      {error && <p className="field-error sp-error"><Icon name="alert" size={14} /> {error}</p>}
    </div>
  );
}
