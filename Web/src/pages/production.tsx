import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { ProductionView } from 'src/sections/production/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`รายการผลิต - ${CONFIG.appName}`}</title>
      </Helmet>

      <ProductionView />
    </>
  );
}
