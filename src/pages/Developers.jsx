// src/pages/Developers.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaTerminal, FaCode, FaKey, FaExternalLinkAlt, FaTag } from 'react-icons/fa';

const Developers = () => {
  return (
    <div className="p-4 max-w-5xl mx-auto font-sans text-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <FaTerminal className="text-2xl text-blue-600" />
        <h1 className="text-2xl font-bold tracking-tight">Developer API</h1>
      </div>
      <p className="text-gray-600 mb-6 leading-relaxed">
        Welcome to the Averon POS API. Use the endpoints below to integrate your own applications,
        websites, or third‑party services with our POS system.
      </p>

      {/* 🔑 Authentication */}
      <section className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FaKey className="text-gray-800" />
          <h2 className="text-base font-bold text-gray-800">Authentication</h2>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          All API requests must include two headers:
        </p>
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 mb-3 font-mono text-sm text-gray-700 overflow-x-auto">
          <span className="text-blue-600">X-API-Key</span>: your-api-key<br />
          <span className="text-blue-600">X-API-Secret</span>: your-api-secret
        </div>
        <p className="text-sm text-gray-600">
          You can generate and manage your API keys in the{' '}
          <Link to="/settings/general" className="text-blue-600 hover:underline inline-flex items-center gap-1">
            Settings → Credentials <FaExternalLinkAlt size={12} />
          </Link>{' '}
          section.
        </p>
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700 font-mono">
            <span className="font-bold text-gray-800">Environment Variable:</span> X_POS_API_URL=https://api.zepLyt.com/api/external
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Use this base URL in your frontend environment variables.
          </p>
        </div>
      </section>

      {/* 📡 Endpoints */}
      <section className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FaCode className="text-gray-800" />
          <h2 className="text-base font-bold text-gray-800">API Endpoints</h2>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Base URL: <code className="bg-gray-200 px-2 py-0.5 rounded text-gray-800">https://averon.com/api/external</code>
        </p>

        {/* GET /categories */}
        <div className="border border-gray-200 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-green-100 text-green-700 px-3 py-0.5 rounded text-xs font-bold">GET</span>
            <code className="text-sm text-gray-800">/categories</code>
          </div>
          <p className="text-sm text-gray-600">Fetch all product categories for the authenticated branch.</p>
          <details className="mt-2 text-sm">
            <summary className="text-blue-600 cursor-pointer hover:text-blue-500">Response Example</summary>
            <pre className="bg-gray-100 border border-gray-300 rounded p-2 mt-2 overflow-x-auto text-xs text-gray-700">
{`[
  { "_id": "60d21b4667d0d8992e610c85", "name": "Main Courses" },
  { "_id": "60d21b4667d0d8992e610c86", "name": "Beverages" }
]`}
            </pre>
          </details>
        </div>

        {/* GET /delivery-locations */}
        <div className="border border-gray-200 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-green-100 text-green-700 px-3 py-0.5 rounded text-xs font-bold">GET</span>
            <code className="text-sm text-gray-800">/delivery-locations</code>
          </div>
          <p className="text-sm text-gray-600">Fetch all delivery cities with their delivery costs and available areas.</p>
          <details className="mt-2 text-sm">
            <summary className="text-blue-600 cursor-pointer hover:text-blue-500">Response Example</summary>
            <pre className="bg-gray-100 border border-gray-300 rounded p-2 mt-2 overflow-x-auto text-xs text-gray-700">
{`[
  {
    "_id": "60d21b4667d0d8992e610c90",
    "city": "Manama",
    "areas": ["Juffair", "Seef", "Adliya"],
    "deliveryCost": 2.5
  },
  {
    "_id": "60d21b4667d0d8992e610c91",
    "city": "Riffa",
    "areas": ["East Riffa", "West Riffa"],
    "deliveryCost": 3.0
  }
]`}
            </pre>
          </details>
        </div>

        {/* GET /products */}
        <div className="border border-gray-200 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-green-100 text-green-700 px-3 py-0.5 rounded text-xs font-bold">GET</span>
            <code className="text-sm text-gray-800">/products</code>
          </div>
          <p className="text-sm text-gray-600">
            Fetch all products for the branch. Optionally filter by category or tag.
          </p>
          <div className="mt-2 space-y-1 text-xs text-gray-600">
            <div><code className="bg-gray-200 px-1 rounded">?category=categoryId</code> – filter by category</div>
            <div><code className="bg-gray-200 px-1 rounded">?tag=hero</code> – filter by product tag (case‑insensitive)</div>
          </div>
          <details className="mt-2 text-sm">
            <summary className="text-blue-600 cursor-pointer hover:text-blue-500">Response Example</summary>
            <pre className="bg-gray-100 border border-gray-300 rounded p-2 mt-2 overflow-x-auto text-xs text-gray-700">
{`[
  {
    "_id": "60d21b4667d0d8992e610c87",
    "name": "Mutton Ribs",
    "price": 12.00,
    "category": { "_id": "...", "name": "Main Courses" },
    "inStock": true,
    "imageUrl": "https://...",
    "tags": ["hero", "featured"]
  }
]`}
            </pre>
          </details>
        </div>

        {/* POST /orders */}
        <div className="border border-gray-200 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-orange-100 text-orange-700 px-3 py-0.5 rounded text-xs font-bold">POST</span>
            <code className="text-sm text-gray-800">/orders</code>
          </div>
          <p className="text-sm text-gray-600">Place a new order. Minimum required: <code className="bg-gray-200 px-1 rounded">items</code> array.</p>
          <details className="mt-2 text-sm">
            <summary className="text-blue-600 cursor-pointer hover:text-blue-500">Request Body Example</summary>
            <pre className="bg-gray-100 border border-gray-300 rounded p-2 mt-2 overflow-x-auto text-xs text-gray-700">
{`{
  "items": [
    { "productId": "60d21b4667d0d8992e610c87", "qty": 2 },
    { "productId": "60d21b4667d0d8992e610c88", "qty": 1 }
  ],
  "customerName": "John Doe",
  "customerMobile": "+97312345678",
  "deliveryAddress": "Juffair, Manama",
  "instructions": "Extra spicy",
  "type": "Delivery",          // optional, default: "Delivery"
  "shippingCost": 2.5,         // optional
  "taxPercentage": 12,         // optional, uses global rate if omitted
  "taxAmount": 1.80            // optional
}`}
            </pre>
          </details>
          <details className="mt-2 text-sm">
            <summary className="text-blue-600 cursor-pointer hover:text-blue-500">Response Example</summary>
            <pre className="bg-gray-100 border border-gray-300 rounded p-2 mt-2 overflow-x-auto text-xs text-gray-700">
{`{
  "success": true,
  "orderId": "60d21b4667d0d8992e610c89",
  "orderNo": "1234",
  "tokenNo": 567,
  "finalAmount": 28.48
}`}
            </pre>
          </details>
        </div>

        {/* GET /settings/currency */}
        <div className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-green-100 text-green-700 px-3 py-0.5 rounded text-xs font-bold">GET</span>
            <code className="text-sm text-gray-800">/settings/currency</code>
          </div>
          <p className="text-sm text-gray-600">Fetch current currency symbol and the global tax rate (in percent).</p>
          <details className="mt-2 text-sm">
            <summary className="text-blue-600 cursor-pointer hover:text-blue-500">Response Example</summary>
            <pre className="bg-gray-100 border border-gray-300 rounded p-2 mt-2 overflow-x-auto text-xs text-gray-700">
{`{
  "currency": "BHD",
  "taxRate": 12
}`}
            </pre>
          </details>
        </div>
      </section>

      {/* 🏷️ Product Tags Section */}
      <section className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FaTag className="text-gray-800" />
          <h2 className="text-base font-bold text-gray-800">Product Tags</h2>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Product tags allow you to group products for dynamic display on your website.
          For example, you can tag a product as <code className="bg-gray-200 px-1 rounded text-gray-800">hero</code> to feature it in a hero banner,
          or <code className="bg-gray-200 px-1 rounded text-gray-800">featured</code> to highlight it in a specific section.
        </p>

        <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 mb-3">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">How to Assign Tags</h3>
          <p className="text-xs text-gray-600 mb-1">
            In the POS Management panel:
          </p>
          <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1 ml-2">
            <li>Go to <span className="text-blue-600">Catalog → Manage Products</span></li>
            <li>Edit a product</li>
            <li>Find the <span className="text-green-600">Tags</span> field</li>
            <li>Enter comma‑separated tags (e.g., <code className="bg-gray-200 px-1 rounded text-gray-800">hero, featured, signature</code>)</li>
            <li>Save the product</li>
          </ol>
        </div>

        <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Fetching Products by Tag</h3>
          <p className="text-xs text-gray-600 mb-1">
            Use the <code className="bg-gray-200 px-1 rounded text-gray-800">?tag=</code> query parameter with the <code className="bg-gray-200 px-1 rounded text-gray-800">GET /products</code> endpoint:
          </p>
          <div className="bg-gray-200 rounded p-1 mb-1 font-mono text-xs text-gray-700 overflow-x-auto">
            GET /products?tag=hero
          </div>
          <p className="text-xs text-gray-600">
            This returns only products that have the <code className="bg-gray-200 px-1 rounded text-gray-800">hero</code> tag (case‑insensitive).
            You can use any tag name you assign in the POS.
          </p>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              <span className="font-bold text-gray-800">💡 Use Case:</span> On your homepage, fetch <code className="bg-gray-200 px-1 rounded text-gray-800">?tag=hero</code> to display the hero product, and <code className="bg-gray-200 px-1 rounded text-gray-800">?tag=featured</code> for a featured products section – all without hardcoding product IDs.
            </p>
          </div>
        </div>
      </section>

      {/* 📘 Example Integration */}
      <section className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <FaCode className="text-gray-800" />
          <h2 className="text-base font-bold text-gray-800">Example Integration (JavaScript)</h2>
        </div>
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 mb-3 overflow-x-auto">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap">
{`const API_BASE = 'https://yourdomain.com/api/external';
const API_KEY = 'your-api-key';
const API_SECRET = 'your-api-secret';

// 1. Fetch products with a specific tag (e.g., "hero")
const response = await fetch(\`\${API_BASE}/products?tag=hero\`, {
  headers: {
    'X-API-Key': API_KEY,
    'X-API-Secret': API_SECRET
  }
});
const heroProducts = await response.json();
console.log('Hero product:', heroProducts[0]);

// 2. Fetch all products (no filter)
const allProducts = await fetch(\`\${API_BASE}/products\`, {
  headers: {
    'X-API-Key': API_KEY,
    'X-API-Secret': API_SECRET
  }
}).then(res => res.json());

// 3. Place an order
const orderPayload = {
  items: [{ productId: '60d...', qty: 2 }],
  customerName: 'John Doe',
  customerMobile: '+97312345678',
  deliveryAddress: 'Juffair, Manama'
};
const orderResp = await fetch(\`\${API_BASE}/orders\`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    'X-API-Secret': API_SECRET
  },
  body: JSON.stringify(orderPayload)
});
const order = await orderResp.json();
console.log('Order placed:', order);`}
          </pre>
        </div>
        <p className="text-sm text-gray-600">
          For production, always keep your API secret secure and never expose it in client‑side code.
        </p>
      </section>
    </div>
  );
};

export default Developers;