// background.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'get-user-data') {
    (async () => {
      const authorizationToken = await chrome.cookies.get({ url: 'https://www.10bis.co.il', name: 'Authorization' });
      const refreshToken = await chrome.cookies.get({ url: 'https://www.10bis.co.il', name: 'RefreshToken' });
      const headers =  {
        cookie: `Authorization=${authorizationToken.value}; RefreshToken=${refreshToken.value}`,
        'Content-Type': 'application/json'
      }
      const [userDataResponse, userTransactionsResponse] = await Promise.all([
        fetch('https://www.10bis.co.il/NextApi/GetUser', {
          method: 'POST',
          headers
        }),
        fetch('https://www.10bis.co.il/NextApi/UserTransactionsReport', {
          method: 'POST',
          headers
        })
      ])
      const userData = await userDataResponse.json();
      const userTransactions = await userTransactionsResponse.json();
      const virtualCreditCard = userTransactions.Data?.moneycards?.find((card) => card.isTenbisCredit);
      const virtualCreditCardId = virtualCreditCard?.moneycardId;
      const virtualCreditCardBalance = virtualCreditCard?.balance;
      // const userEmail = userData.Data?.email;
      const userFirstName = userData.Data?.firstName;
      const userLastName = userData.Data?.lastName;
      sendResponse({ virtualCreditCardId, virtualCreditCardBalance, userFirstName, userLastName });
    })();
    return true
  }
})
