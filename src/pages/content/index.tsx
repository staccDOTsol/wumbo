import { createRoot } from 'react-dom/client';
import {
  Action,
  ActionConfig,
  ActionContext,
  type ActionAdapter,
  type ActionCallbacksConfig,
} from '../../../../../../src/api';
import React from 'react';
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

export function setupTwitterObserver(
  config: ActionAdapter,
  callbacks: Partial<ActionCallbacksConfig> = {},
  options: Partial<ObserverOptions> = DEFAULT_OPTIONS,
) {
  const mergedOptions = normalizeOptions(options);
  const twitterReactRoot = document.getElementById('react-root')!;

  // if we don't have the registry, then we don't show anything
    // entrypoint
    const observer = new MutationObserver((mutations) => {
      // it's fast to iterate like this
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

// New function to handle new nodes
const handleNewNode = async (
  node: Element,
  config: ActionAdapter,
  callbacks: Partial<ActionCallbacksConfig>,
  options: NormalizedObserverOptions,
) => {
  const element = node as Element;
  // Find all t.co links
  const tcoLinks = element.querySelectorAll('a[href^="https://t.co/"]');
  if (tcoLinks.length === 0) {
    return;
  }
  
  // Process each t.co link
  tcoLinks.forEach(async (link) => {
    if (link instanceof HTMLAnchorElement) {
      console.log('Found t.co link:', link.href);
      
      // Create a container for the action content
      const container = document.createElement('div');
      container.className = 'action-content-container';

      // Resolve the shortened URL
      resolveTwitterShortenedUrl(link.href)
        .then(resolvedUrl => {
          // Create an iframe to render the webapp
          const iframe = document.createElement('iframe');
          iframe.src = resolvedUrl.toString();
          iframe.style.width = '100%';
          iframe.style.height = '900px'; // Adjust height as needed
          iframe.style.border = 'none';

          // Append the iframe to the container
          container.appendChild(iframe);

          // Replace the link with the container
          link.parentElement?.replaceChild(container, link);

          // Keep the original link text as a caption
          const caption = document.createElement('div');
          caption.textContent = link.textContent || link.href;
          caption.style.fontSize = '0.8em';
          caption.style.color = '#888';
          container.appendChild(caption);
        })
        .catch(error => {
          console.error('Error resolving shortened URL:', error);
          container.textContent = 'Error loading content';
        });
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

function findElementByTestId(element: Element, testId: string) {
  if (element.attributes.getNamedItem('data-testid')?.value === testId) {
    return element;
  }
  return element.querySelector(`[data-testid="${testId}"]`);
}

(async () => {
  const endpoint = await getHttpEndpoint();
  setupTwitterObserver(new ActionConfig(endpoint, {
    connect: async (context: ActionContext) => {
      try {
        // Remove hooks from here as they can't be used outside of React components
        const tonConnectUI = (window as any).tonConnectUI;
        if (!tonConnectUI) {
          throw new Error('TON Connect UI not initialized');
        }
        await tonConnectUI.openModal();
        const wallet = (window as any).tonWallet;
        if (!wallet) {
          throw new Error('Failed to connect TON wallet');
        }
        const address = wallet.address;
        if (!address) {
          throw new Error('Failed to get TON address');
        }
        return address;
      } catch (error) {
        console.error('Error connecting to TON wallet:', error);
        throw error;
      }
    },
    signTransaction: async (tx: string, context: ActionContext) => {
      try {
        const { ton } = window as any;
        if (!ton) {
          throw new Error('TON wallet not found');
        }
        const transaction = ton.Transaction.from(Buffer.from(tx, 'base64'));
        const signedTx = await ton.signTransaction(transaction);
        const signature = await ton.sendTransaction(signedTx);
        return { signature };
      } catch (error: any) {
        console.error('Error signing TON transaction:', error);
        return { error: error.message };
      }
    }
  }));
})();