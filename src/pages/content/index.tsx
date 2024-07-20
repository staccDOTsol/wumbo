import { createRoot } from 'react-dom/client';
import {
  Action,
  ActionConfig,
  ActionContext,
  type ActionAdapter,
  type ActionCallbacksConfig,
} from '../../../../../../src/api';
import React from 'react';
import * as solaanWeb3 from '@solana/web3.js'
import { checkSecurity, type SecurityLevel } from '../../../../../../src/shared';
import { ActionContainer } from '../../../../../../src/ui';
import { noop } from '../../../../../../src/utils/constants';
import { isInterstitial } from '../../../../../../src/utils/interstitial-url';
import { proxify } from '../../../../../../src/utils/proxify';
import { ActionsURLMapper, type ActionsJsonConfig } from '../../../../../../src/utils/url-mapper';
import { Transaction, sendAndConfirmRawTransaction } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
// ... existing code ...
import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { TonClient } from '@ton/ton';
import { getHttpEndpoint } from '@orbs-network/ton-access';

import { useTonAddress, useTonConnectUI, useTonWallet, TonConnectButton, TonConnectUIProvider } from '@tonconnect/ui-react';

// ... existing code ...


type ObserverSecurityLevel = SecurityLevel;

export interface ObserverOptions {
  // trusted > unknown > malicious
  securityLevel:
    | ObserverSecurityLevel
    | Record<'websites' | 'interstitials' | 'actions', ObserverSecurityLevel>;
}

interface NormalizedObserverOptions {
  securityLevel: Record<
    'websites' | 'interstitials' | 'actions',
    ObserverSecurityLevel
  >;
}

const DEFAULT_OPTIONS: ObserverOptions = {
  securityLevel: 'all',
};

const normalizeOptions = (
  options: Partial<ObserverOptions>,
): NormalizedObserverOptions => {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    securityLevel: (() => {
      if (!options.securityLevel) {
        return {
          websites: DEFAULT_OPTIONS.securityLevel as ObserverSecurityLevel,
          interstitials: DEFAULT_OPTIONS.securityLevel as ObserverSecurityLevel,
          actions: DEFAULT_OPTIONS.securityLevel as ObserverSecurityLevel,
        };
      }

      if (typeof options.securityLevel === 'string') {
        return {
          websites: options.securityLevel,
          interstitials: options.securityLevel,
          actions: options.securityLevel,
        };
      }

      return options.securityLevel;
    })(),
  };
};


// Modify the setupTwitterObserver function to use the snap
export function setupTwitterObserver(
  config: ActionAdapter,
  callbacks: Partial<ActionCallbacksConfig> = {},
  options: Partial<ObserverOptions> = DEFAULT_OPTIONS,
) {
  const mergedOptions = normalizeOptions(options);
  const twitterReactRoot = document.getElementById('react-root')!;

  const observer = new MutationObserver((mutations) => {
    for (let i = 0; i < mutations.length; i++) {
      const mutation = mutations[i];
      for (let j = 0; j < mutation.addedNodes.length; j++) {
        const node = mutation.addedNodes[j];
        if (node.nodeType !== Node.ELEMENT_NODE) {
          continue;
        }
        handleNewNode(
          node as Element,
          config,
          callbacks,
          mergedOptions,
        ).catch(noop);
      }
    }
  });

  if (twitterReactRoot instanceof Node) {
    observer.observe(twitterReactRoot, { childList: true, subtree: true });
  } else {
    console.error('Twitter React root element not found or is not a valid Node');
  }
}


const handleNewNode = async (
  node: Element,
  config: ActionAdapter,
  callbacks: Partial<ActionCallbacksConfig>,
  options: NormalizedObserverOptions,
) => {
  const tcoLinks = node.querySelectorAll('a[href^="https://t.co/"]');
  if (tcoLinks.length === 0) {
    return;
  }

  tcoLinks.forEach(async (link) => {
    if (link instanceof HTMLAnchorElement) {
      console.log('Found t.co link:', link.href);

      const container = document.createElement('div');
      container.className = 'action-content-container';
      try {
        const resolvedUrl = await resolveTwitterShortenedUrl(link.href);

        const action = await Action.fetch(resolvedUrl.href, config).catch(() => null);

        if (!action) {
          console.log('No action found for:', resolvedUrl.toString());
          return;
        }

        const actionContainer = createAction({
          originalUrl: resolvedUrl,
          action,
          callbacks,
          options,
          isInterstitial: false,
        });

        link.parentElement?.replaceChild(actionContainer, link);

        const caption = document.createElement('div');
        caption.textContent = link.textContent || link.href;
        caption.style.fontSize = '0.8em';
        caption.style.color = '#888';
        actionContainer.appendChild(caption);
      } catch (error) {
        console.error('Error resolving shortened URL:', error);
        container.textContent = 'Error loading content';
      }
    }
  });
};

function createAction({
  originalUrl,
  action,
  callbacks,
  options,
}: {
  originalUrl: URL;
  action: Action;
  callbacks: Partial<ActionCallbacksConfig>;
  options: NormalizedObserverOptions;
  isInterstitial: boolean;
}) {
  const container = document.createElement('div');
  container.className = 'dialect-action-root-container';

  const actionRoot = createRoot(container);

  actionRoot.render(
    <ActionContainer
      action={action}
      websiteUrl={originalUrl.toString()}
      websiteText={originalUrl.hostname}
      callbacks={callbacks}
      securityLevel={options.securityLevel}
    />,
  );

  return container;
}

async function resolveTwitterShortenedUrl(shortenedUrl: string): Promise<URL> {
  const res = await fetch(shortenedUrl);
  const html = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const actionUrl = doc.querySelector('title')?.textContent;
  return new URL(actionUrl!);
}
function injectMetaMaskButton() {
  const button = document.createElement('button');
  button.id = 'metamask-connect-button';
  button.innerText = 'Connect MetaMask';
  button.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 9999;
    padding: 10px;
    background-color: #f44336;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  `;
  button.addEventListener('click', function() {
    const script = document.createElement('script');
    script.textContent = `
      if (typeof window.solana !== 'undefined') {
        (async () => {
          try {
            await window.solana.connect();
            const publicKey = window.solana.publicKey.toString();
            console.log('Connected to Solana wallet:', publicKey);
            // Update button state
            const button = document.getElementById('metamask-connect-button');
            if (button) {
              button.innerText = 'Connected: ' + publicKey.slice(0, 4) + '...' + publicKey.slice(-4);
              button.style.backgroundColor = '#4CAF50';
            }
          } catch (error) {
            console.error('Failed to connect to Solana wallet:', error);
          }
        })();
      } else {
        console.error('Solana wallet not detected');
      }
    `;
    document.head.appendChild(script);
  });
  document.body.appendChild(button);
}

async function handleMetaMaskConnection() {
  // @ts-ignore
  if (typeof window.ethereum !== 'undefined') {
    try {
      // @ts-ignore
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      updateButtonState(true, account);
    } catch (error) {
      console.error('Failed to connect to MetaMask:', error);
      updateButtonState(false);
    }
  } else {
    console.error('MetaMask not detected');
    updateButtonState(false);
  }
}

function updateButtonState(isConnected: boolean, account?: string) {
  const button = document.getElementById('metamask-connect-button');
  if (button) {
    if (isConnected && account) {
      button.innerText = `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`;
      button.style.backgroundColor = '#4CAF50';
    } else {
      button.innerText = 'Connect MetaMask';
      button.style.backgroundColor = '#f44336';
    }
  }
}

function findElementByTestId(element: Element, testId: string) {
  if (element.attributes.getNamedItem('data-testid')?.value === testId) {
    return element;
  }
  return element.querySelector(`[data-testid="${testId}"]`);
}

(async () => {

  setupTwitterObserver(new ActionConfig('https://rpc.ironforge.network/mainnet?apiKey=01HRZ9G6Z2A19FY8PR4RF4J4PW', {
    connect: async (context: ActionContext) => {
      const script = document.createElement('script');
      script.textContent = `
        (async () => {
          try {
            if (!window.solana) {
              throw new Error('Solana wallet not found');
            }
            await window.solana.connect();
            const publicKey = window.solana.publicKey;
            if (!publicKey) {
              throw new Error('Failed to get Solana public key');
            }
            window.postMessage({ type: 'SOLANA_CONNECT_RESULT', publicKey: publicKey.toString() }, '*');
          } catch (error) {
            console.error('Error connecting to Solana wallet:', error);
            window.postMessage({ type: 'SOLANA_CONNECT_ERROR', error: error.message }, '*');
          }
        })();
      `;
      
      document.head.appendChild(script);
      
      return new Promise((resolve, reject) => {
        window.addEventListener('message', function handler(event) {
          if (event.data.type === 'SOLANA_CONNECT_RESULT') {
            window.removeEventListener('message', handler);
            resolve(event.data.publicKey);
          } else if (event.data.type === 'SOLANA_CONNECT_ERROR') {
            window.removeEventListener('message', handler);
            reject(new Error(event.data.error));
          }
        });
      });
    },
    signTransaction: async (tx: string, context: ActionContext) => {
      return new Promise( (resolve, reject) => {
        console.log('Starting signTransaction function');
        const transactionBase64 = tx;
        console.log('Transaction base64:', transactionBase64);
        // Use the existing solanaWeb3 object
        // Inject Solana Web3.js library from unpkg
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js';
        script.onload = () => {
          const mainScript = document.createElement('script');
          mainScript.textContent = `
          (async () => {
            console.log('Executing script content');
            
            if (!window.solana) {
              console.error('Solana wallet not found');
              return;
            }
            
            console.log('Solana wallet found');
            const { Transaction } = solanaWeb3;
            console.log('Transaction class retrieved from solanaWeb3');
            
            const fromBase64 = (base64) => {
              console.log('Converting base64 to Uint8Array');
              const binaryString = atob(base64);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              console.log('Conversion complete');
              return bytes;
            };
            
            const transaction = Transaction.from(fromBase64('${transactionBase64}'));
            console.log('Transaction created from base64');
            
            console.log('Signing transaction');
            const signedTransaction = await window.solana.signTransaction(transaction);
            console.log('Transaction signed');
            const serializedTransaction = signedTransaction.serialize();
            console.log('Transaction serialized');
            
            console.log('Posting message with signed transaction');
            window.postMessage({ type: 'TRANSACTION_SIGNED_SOLANA', signature: serializedTransaction.toString('base64') }, '*');
          })();
          `;
          document.head.appendChild(mainScript);
        };
        document.head.appendChild(script);
      });
    }
  }));
})();
