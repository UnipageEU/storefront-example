import { Fragment } from 'react';

/** A name that may wrap after "_" and ":" (codes like "scenario:ADDON_GROUP"), never mid-word. */
export default function Breakable({ text }) {
  const parts = String(text ?? '').split(/(?<=[_:])/);
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && <wbr />}
    </Fragment>
  ));
}
