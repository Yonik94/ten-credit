async function getTokens() {
  const authorizationToken = await chrome.cookies.get({ url: 'https://www.10bis.co.il', name: 'Authorization' });
  const refreshToken = await chrome.cookies.get({ url: 'https://www.10bis.co.il', name: 'RefreshToken' });
  return { authorizationToken, refreshToken };
}

async function getUserOrdersList() {
  const { authorizationToken, refreshToken } = await getTokens();
  const headers =  {
    cookie: `Authorization=${authorizationToken.value}; RefreshToken=${refreshToken.value}`,
    'Content-Type': 'application/json'
  }
  const response = await fetch('https://www.10bis.co.il/NextApi/UserTransactionsReport', {
    method: 'POST',
    headers
  });
  const data = await response.json();
  console.log('data',data);
  return data?.Data?.orderList;
}

async function renderActiveOrders() {
  const activeOrdersContainerElement = document.querySelector('.active-orders');
  const ordersList = await getUserOrdersList();
  console.log('ordersList',ordersList);
  let innerHTML = `<h2>${ordersList?.length} Active Orders</h2>`;
  for (const order of ordersList || []) {
    innerHTML += `<div class="order">
      <h3>${order?.orderNumber}</h3>
      <p>${order?.orderDate}</p>
    </div>`
  }
  activeOrdersContainerElement.innerHTML = innerHTML;
}

renderActiveOrders();
