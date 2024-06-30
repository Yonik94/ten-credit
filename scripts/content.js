// async function getCookies() {
//   return new Promise((resolve, reject) => {
//     chrome.cookies.getAll({ domain: '10bis.co.il' }, (cookies) => {
//       resolve(cookies);
//     });
//   });
// }

// Select the target node
const targetNode = document.body;
// Options for the observer (which mutations to observe)
const config = { attributes: true, childList: true, subtree: true };

let flowObserver;

function fixTotalPrice(mutationsList, observer, userDetails) {
  const { userFirstName, userLastName } = userDetails;
  for (const mutation of mutationsList) {
    const checkoutPaymentMehtodLineElements = document.querySelectorAll('[class*="CheckoutPaymentMethodLine"]');
    const connectedUserCheckoutPaymentMehtodLineElement = [...checkoutPaymentMehtodLineElements].find((element) => {
      const paymentNameElement = element?.querySelector('[class*="PaymentMethodIconAndDetails"][class*="CheckoutPaymentMethodLineCardText"]');
      return paymentNameElement?.innerText === `${userFirstName} ${userLastName}`;
    });
    if (connectedUserCheckoutPaymentMehtodLineElement) {
      const addAdditionalAmountButtonElement = connectedUserCheckoutPaymentMehtodLineElement.querySelector('[class*="CheckoutPaymentMethodLine"][class*="AddAdditionalAmountButton"]');
      observer.disconnect();
      addAdditionalAmountButtonElement?.click();
      break;
    }
  }
}

function getCreditPaymentMethodLineElement() {
  const checkoutPaymentMehtodLineElements = document.querySelectorAll('[class*="CheckoutPaymentMethodLine"]');
  const checkoutPaymentMehtodLineElement = [...checkoutPaymentMehtodLineElements || []].find((element) => {
    const paymentNameElement = element?.querySelector('[class*="PaymentMethodIconAndDetails"][class*="CheckoutPaymentMethodLineCardText"]');
    const paymentBalanceElement = element?.querySelector('[class*="PaymentMethodIconAndDetails"][class*="RemainingSumText"]');
    return paymentNameElement?.innerText === 'תן ביס קרדיט' && paymentBalanceElement?.innerText.includes('יתרה:');
  });
  return checkoutPaymentMehtodLineElement;
}

async function setCreditValue(mutationsList, observer, userDetails) {
  if (!userDetails) {
    userDetails = await sendMessage('get-user-data');
  }
  const { virtualCreditCardBalance, userFirstName, userLastName } = userDetails;
  for (const mutation of mutationsList) {
    const checkoutPaymentMehtodLineElements = document.querySelectorAll('[class*="CheckoutPaymentMethodLine"]');
    const checkoutPaymentMehtodLineElement = getCreditPaymentMethodLineElement();
    const connectedUserCheckoutPaymentMehtodLineElement = [...checkoutPaymentMehtodLineElements].find((element) => {
      const paymentNameElement = element?.querySelector('[class*="PaymentMethodIconAndDetails"][class*="CheckoutPaymentMethodLineCardText"]');
      return paymentNameElement?.innerText === `${userFirstName} ${userLastName}`;
    });
    const connectedUserPrice = connectedUserCheckoutPaymentMehtodLineElement?.querySelector('input[class*="CheckoutPaymentMethodLine"][class*="Input"]')?.value;
    const creditInputElement = checkoutPaymentMehtodLineElement?.querySelector('input[class*="CheckoutPaymentMethodLine"][class*="Input"]');
    if (!creditInputElement || !connectedUserPrice) {
      continue
    }
    observer.disconnect();
    const { daily, monthly, weekly } = virtualCreditCardBalance
    const creditBalance = daily || weekly || monthly;
    const creditValueToUse = +connectedUserPrice >= +creditBalance ? +creditBalance : +connectedUserPrice;
    creditInputElement.value = creditValueToUse;
    const event = new Event('input', { bubbles: true });
    creditInputElement.dispatchEvent(event);
    const changeEvent = new Event('change', { bubbles: true });
    creditInputElement.dispatchEvent(changeEvent);
    flowObserver = new MutationObserver((mutationsList, observer) => fixTotalPrice(mutationsList, observer, userDetails));
    flowObserver.observe(targetNode, config);
    break;
  }
}
function clickOnAddSelectedPaymentOptionButtonElement(mutationsList, observer, userDetails) {
  for (const mutation of mutationsList) {
    if (mutation.type === 'childList') {
      const addSelectedPaymentOptionButtonElement = document.querySelector('[class*="AvailablePaymentsSection"][class*="SubmitButton"]');
      if (addSelectedPaymentOptionButtonElement && !addSelectedPaymentOptionButtonElement.disabled) {
        observer.disconnect();
        addSelectedPaymentOptionButtonElement.click();
        flowObserver = new MutationObserver((mutationsList, observer) => setCreditValue(mutationsList, observer, userDetails));
        flowObserver.observe(targetNode, config);
        break;
      }
    }
  }
}
function clickOnCreditLabel(mutationsList, observer, userDetails) {
  const { virtualCreditCardId } = userDetails;
  for (const mutation of mutationsList) {
    if (mutation.type === 'childList') {
      const creditLabelElement = mutation.target.querySelector(`label[for="payment-card-${virtualCreditCardId}"]`);
      if (creditLabelElement) {
        creditLabelElement.click();
        observer.disconnect();
        flowObserver = new MutationObserver((mutationsList, observer) => clickOnAddSelectedPaymentOptionButtonElement(mutationsList, observer, userDetails));
        flowObserver.observe(targetNode, config);
        break;
      }
    }
  }
}

async function sendMessage(messageName, messageData) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: messageName }, messageData || {}, (response) => {
      resolve(response);
    })
  })
}

async function clickOnAddPaymentOption(mutationsList, observer) {
  for (const mutation of mutationsList) {
    if (mutation.type === 'childList') {
      const addAvailablePaymentsButtonElement = mutation.target.querySelector('[class*="PaymentButton"][class*=AddPaymentButtonWithAvailablePayments]');
      if (addAvailablePaymentsButtonElement) {
        const userDetails = await sendMessage('get-user-data');
        observer.disconnect();
        flowObserver = new MutationObserver((mutationsList, observer) => clickOnCreditLabel(mutationsList, observer, userDetails));
        flowObserver.observe(targetNode, config);
        addAvailablePaymentsButtonElement.click();
        break;
      }
    }
  }
};


function checkForModalElement() {
  const modalElement = document.querySelector('[data-test-id="rootModal"]');
  const checkoutButtonElement = modalElement?.querySelector('[data-test-id="checkoutSubmitOrderBtn"]');
  if (flowObserver && !modalElement) {
    flowObserver.disconnect();
    flowObserver = null;
  } else if (!flowObserver && checkoutButtonElement) {
    const checkoutPaymentMehtodLineElement = getCreditPaymentMethodLineElement();
    if (!checkoutPaymentMehtodLineElement) {
      flowObserver = new MutationObserver(clickOnAddPaymentOption);
      flowObserver.observe(modalElement, config);
    } else {
      flowObserver = new MutationObserver(setCreditValue);
      flowObserver.observe(targetNode, config);
    }
  }
};

// Create an observer instance linked to the callback function
const generalObserver = new MutationObserver(checkForModalElement);

// Start observing the target node for configured mutations
generalObserver.observe(targetNode, config);
