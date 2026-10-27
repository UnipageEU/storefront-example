// The looks of the same shop. Each lives under its own path (`/classic`,
// `/editorial`, `/diner`); the chooser at `/` links to all of them. Everything below the look
// (state/, api.js, options.js, format.js and the hooks in shared/) is shared,
// so the cart, the quote and the checkout are the same whichever look you use.
import { createContext, useContext } from 'react';
import { load, save } from '../storage.js';

export const STYLES = [
  {
    key: 'classic',
    label: 'Classic',
    blurb: 'A familiar webshop: the menu in ruled rows, a sticky bag and a step-by-step checkout.',
  },
  {
    key: 'editorial',
    label: 'Editorial',
    blurb: 'The menu printed like a burger joint’s: big type, numbered dishes and a receipt that prints as you order.',
  },
  {
    key: 'diner',
    label: 'Diner',
    blurb: 'The menu as a diner card: two columns, dotted leaders and a guest check that adds up as you order.',
  },
];

const KEY = 'sf-style';
const isStyle = (key) => STYLES.some((s) => s.key === key);

/** The look the visitor chose last, or null on a first visit. */
export const lastStyle = () => {
  const key = load(KEY, null);
  return isStyle(key) ? key : null;
};

/** The look to open a bare link in, like the payment return (`/order/:id`): the last one, else classic. */
export const savedStyle = () => lastStyle() || 'classic';

export const saveStyle = (key) => {
  if (isStyle(key)) save(KEY, key);
};

/** The path the current look is mounted on (`/classic`): links inside a look are relative to it. */
export const BaseContext = createContext('');
export const useBase = () => useContext(BaseContext);
