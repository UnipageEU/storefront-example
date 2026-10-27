import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store.js';
import { shopStore } from '../state/shop.js';
import Icon from './Icon.jsx';
import { useBase } from '../shared/shopStyle.js';
import './AppHeader.css';

export default function AppHeader() {
  const { store } = useStore(shopStore);
  const base = useBase();
  const onMenu = useLocation().pathname === base;
  // A dead logo URL falls back to the name alone instead of a broken image.
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to={base} className="brand" aria-label={`${store?.name || 'Shop'}, back to the menu`}>
          {store?.branding?.logo && !logoFailed ? (
            <img src={store.branding.logo} alt="" className="brand-logo" onError={() => setLogoFailed(true)} />
          ) : null}
          <span className="brand-name">{store?.name || ''}</span>
        </Link>
        <div className="header-actions">
          <Link to="/" className="header-style" title="Choose another look for this shop">Change style</Link>
          {!onMenu && (
            <Link to={base} className="btn btn-ghost header-back">
              <Icon name="chevron-left" size={18} /> Menu
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
