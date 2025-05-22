## ตั้งค่า zxing_reader.wasm

# ไฟล์ node_modules\barcode-detector\dist\es\ponyfill.js บรรทัดที่ 166

    const Di = "2.1.0", Ii = "37b847798a1af55d3a289a9516a751fcafae3c23", ci = {
        locateFile: (i, f) => {
            const p = i.match(/_(.+?)\.wasm$/);
            return p ? `https://fastly.jsdelivr.net/npm/zxing-wasm@2.1.0/dist/${p[1]}/${i}` : f + i;
        }
    }, Rt = /* @__PURE__ */ new WeakMap();

# แก้ return p ? `https://fastly.jsdelivr.net/npm/zxing-wasm@2.1.0/dist/${p[1]}/${i}` : f + i;

# เป็น return p ? `/${p[1]}/${i}` : f + i; หรือ return p ? `/reader/zxing_reader.wasm` : f + i;

## Minimal UI ([Free version](https://free.minimals.cc/))

![license](https://img.shields.io/badge/license-MIT-blue.svg)

![preview](public/assets/images/minimal-free-preview.jpg)

> Free React Admin Dashboard made with Material-UI components and React + Vite.js.

## Pages

- [Dashboard](https://free.minimals.cc/)
- [Users](https://free.minimals.cc/user)
- [Products](https://free.minimals.cc/products)
- [Blog](https://free.minimals.cc/blog)
- [Sign in](https://free.minimals.cc/sign-in)
- [Not found](https://free.minimals.cc/404)

## Quick start

- Clone the repo: `git clone https://github.com/minimal-ui-kit/material-kit-react.git`
- Recommended: `Node.js v20.x`
- **Install:** `npm i` or `yarn install`
- **Start:** `npm run dev` or `yarn dev`
- **Build:** `npm run build` or `yarn build`
- Open browser: `http://localhost:3039`

## Upgrade to PRO Version

| Minimal Free                | [Minimal Pro](https://material-ui.com/store/items/minimal-dashboard/)                                   |
| :-------------------------- | :------------------------------------------------------------------------------------------------------ |
| **6** Pages                 | **70+** Pages                                                                                           |
| **Partial** theme customize | **Fully** theme customize                                                                               |
| -                           | **Next.js** version                                                                                     |
| -                           | **TypeScript** version (Standard Plus and Extended license)                                             |
| -                           | Design **Figma** file (Standard Plus and Extended license)                                              |
| -                           | Authentication with **Amplify**, **Auth0**, **JWT**, **Firebase** and **Supabase**                      |
| -                           | Light/dark mode, right-to-left, form validation... ([+more components](https://minimals.cc/components)) |
| -                           | Complete users flows                                                                                    |
| -                           | 1 year of free updates / 6 months of technical support                                                  |
| -                           | Learn more: [Package & license](https://docs.minimals.cc/package)                                       |

## License

Distributed under the [MIT](https://github.com/minimal-ui-kit/minimal.free/blob/main/LICENSE.md) license.

## Contact us

Email: support@minimals.cc

## Service My sql

    - net stop MySQL
    - net start MySQL
    - net restart MySQL
    - net start

## server

    ** รีสตาร์ท Server
        * shutdown /r
        * shutdown -r -t 0
    ** แชร์โฟล์เดอร์
        * net share Apache24=D:\Apache24 /grant:PD,full

## ตั้งค่า Apache2 Server mod_rewrite

    ** เข้าไปที่ "C:\Apache24\conf\httpd.conf"
        * ลบ # ออกจาก  LoadModule rewrite_module modules/mod_rewrite.so
        * ลบ # ออกจาก  ServerName 192.168.1.24:80
        * เพิ่ม   <Directory "C:/Apache24/htdocs">
                    Options Indexes FollowSymLinks
                    AllowOverride All
                    Require all granted
                </Directory>
        * บันทึก

    ** สร้างไฟล์ .htaccess ไว้ในโฟล์เดอร์โปรเจค index.html
        * เพิ่ม   <IfModule mod_rewrite.c>
                    RewriteEngine On
                    RewriteBase /
                    RewriteRule ^index\.html$ - [L]
                    RewriteCond %{REQUEST_FILENAME} !-f
                    RewriteCond %{REQUEST_FILENAME} !-d
                    RewriteRule . /index.html [L]
                </IfModule>
        * บันทึก
