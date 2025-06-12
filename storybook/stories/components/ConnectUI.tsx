import React from 'react';
import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
import { Avatar, Name } from '@coinbase/onchainkit/identity';

export default function ConnectUI() {
  return (
    <Wallet>
      <ConnectWallet>
        <Avatar className="h-6 w-6" />
        <Name />
      </ConnectWallet>
    </Wallet>
  );
}
