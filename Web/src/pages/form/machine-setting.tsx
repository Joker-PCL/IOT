import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { FormMachineSetting } from 'src/sections/form/machine-setting';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`ตั้งค่าเครื่องจักร - ${CONFIG.appName}`}</title>
        <meta
          name="description"
          content="The starting point for your next project with Minimal UI Kit, built on the newest version of Material-UI ©, ready to be customized to your style"
        />
        <meta name="keywords" content="react,material,kit,application,dashboard,admin,template" />
      </Helmet>
      <FormMachineSetting/>
    </>
  );
}
