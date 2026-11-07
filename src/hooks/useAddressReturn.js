import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * "Not your area? Re-detect location" leaves the address form for the
 * location step and comes back to it. These two helpers carry that round trip
 * through the router, so it works the same from Home, Cart, Profile and the
 * post-signup address page.
 *
 *   const redetect = useRedetect();          // in the screen with the form
 *   <AddressForm onRedetect={redetect} />
 *
 *   const [reopen, done] = useReopenAddressForm();  // same screen
 *   useEffect(() => { if (reopen) { openTheForm(); done(); } }, [reopen]);
 *
 * The form keeps what was typed in sessionStorage while away.
 */
export function useRedetect() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return useCallback(() => navigate('/location', { state: { returnTo: pathname, reopenAddress: true } }), [navigate, pathname]);
}

/** True once when we have just come back from re-detecting; call done() after reopening. */
export function useReopenAddressForm() {
  const loc = useLocation();
  const navigate = useNavigate();
  const [reopen, setReopen] = useState(Boolean(loc.state?.reopenAddress));
  useEffect(() => {
    if (loc.state?.reopenAddress) setReopen(true);
  }, [loc.state]);
  const done = useCallback(() => {
    setReopen(false);
    // Forget the flag, so Back or a refresh does not reopen the form again.
    navigate(loc.pathname, { replace: true, state: null });
  }, [navigate, loc.pathname]);
  return [reopen, done];
}
