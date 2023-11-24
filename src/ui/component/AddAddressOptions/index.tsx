import React, { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { openInternalPageInTab } from 'ui/utils/webapi';
import IconWalletConnect from 'ui/assets/walletlogo/walletconnect.svg';
import IconCreatenewaddr from 'ui/assets/walletlogo/createnewaddr.svg';
import IconAddwatchmodo from 'ui/assets/walletlogo/addwatchmode.svg';
import IconHardWallet from 'ui/assets/address/hardwallet.svg';
import IconMobileWallet from 'ui/assets/address/mobile-wallet.svg';
import InstitutionalWallet from 'ui/assets/address/institutional-wallet.svg';
import IconMetamask from 'ui/assets/dashboard/icon-metamask.svg';
import IconMnemonics from 'ui/assets/import/mnemonics-light.svg';
import IconPrivatekey from 'ui/assets/import/privatekey-light.svg';

import './style.less';

import {
  IS_CHROME,
  WALLET_BRAND_CONTENT,
  BRAND_WALLET_CONNECT_TYPE,
  WALLET_BRAND_TYPES,
  IWalletBrandContent,
  WALLET_SORT_SCORE,
  WALLET_BRAND_CATEGORY,
} from 'consts';

import clsx from 'clsx';
import _ from 'lodash';
import { connectStore } from '@/ui/store';
import { Item } from '../Item';
import { useWallet } from '@/ui/utils';
import { Modal } from 'antd';

const getSortNum = (s: string) => WALLET_SORT_SCORE[s] || 999999;

const AddAddressOptions = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const location = useLocation();
  const wallet = useWallet();

  const [selectedWalletType, setSelectedWalletType] = useState('');
  const handleRouter = async (action: (h: typeof history) => void) =>
    (await wallet.isBooted())
      ? action(history)
      : history.push({
          pathname: '/password',
          state: {
            handle: (h: typeof history) => action(h),
          },
        });

  // keep selected wallet type
  const rootRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const lastSelectedWalletType = sessionStorage.getItem(
      'SELECTED_WALLET_TYPE'
    );
    if (
      lastSelectedWalletType &&
      ([
        WALLET_BRAND_CATEGORY.MOBILE,
        WALLET_BRAND_CATEGORY.INSTITUTIONAL,
      ] as string[]).includes(lastSelectedWalletType)
    ) {
      setSelectedWalletType(lastSelectedWalletType);
      setTimeout(() => {
        rootRef.current
          ?.querySelector(`.${lastSelectedWalletType}`)
          ?.scrollIntoView({
            behavior: 'smooth',
          });
      }, 150);
    }

    // clear cache when leave page
    return () => {
      sessionStorage.removeItem('SELECTED_WALLET_TYPE');
    };
  }, []);

  const checkQRBasedWallet = async (item: IWalletBrandContent) => {
    const { allowed, brand } = await wallet.checkQRHardwareAllowImport(
      item.brand
    );

    if (!allowed) {
      Modal.error({
        title: t('page.newAddress.unableToImport.title'),
        content: t('page.newAddress.unableToImport.description', [brand]),
        okText: t('global.ok'),
        centered: true,
        maskClosable: true,
        className: 'text-center',
      });
      return false;
    }

    return true;
  };

  type Valueof<T> = T[keyof T];
  const connectRouter1 = React.useCallback(
    (
      history,
      item: Valueof<typeof WALLET_BRAND_CONTENT>,
      params?: {
        address: string;
        chainId: number;
      }
    ) => {
      if (item.connectType === 'BitBox02Connect') {
        openInternalPageInTab('import/hardware?connectType=BITBOX02');
      } else if (item.connectType === 'GridPlusConnect') {
        openInternalPageInTab('import/hardware?connectType=GRIDPLUS');
      } else if (item.connectType === 'TrezorConnect') {
        openInternalPageInTab('import/hardware?connectType=TREZOR');
      } else if (item.connectType === 'LedgerConnect') {
        openInternalPageInTab(
          IS_CHROME
            ? 'import/hardware/ledger-connect'
            : 'import/hardware/ledger'
        );
      } else if (item.connectType === 'OneKeyConnect') {
        openInternalPageInTab('import/hardware?connectType=ONEKEY');
      } else if (item.connectType === 'GnosisConnect') {
        history.push({
          pathname: '/import/gnosis',
        });
      } else if (item.connectType === BRAND_WALLET_CONNECT_TYPE.QRCodeBase) {
        checkQRBasedWallet(item).then((success) => {
          if (!success) return;
          openInternalPageInTab(`import/hardware/qrcode?brand=${item.brand}`);
        });
      } else if (
        item.connectType === BRAND_WALLET_CONNECT_TYPE.CoboArgusConnect
      ) {
        history.push({
          pathname: '/import/cobo-argus',
          state: params,
        });
      } else {
        history.push({
          pathname: '/import/wallet-connect',
          state: {
            brand: item,
          },
        });
      }
    },
    []
  );
  const connectRouter = (
    item: Valueof<typeof WALLET_BRAND_CONTENT>,
    params?: {
      address: string;
      chainId: number;
    }
  ) => handleRouter((h) => connectRouter1(h, item, params));
  const brandWallet = React.useMemo(
    () =>
      (Object.values(WALLET_BRAND_CONTENT)
        .map((item) => {
          if (item.hidden) return;
          return {
            leftIcon: item.image,
            content: item.name,
            brand: item.brand,
            connectType: item.connectType,
            image: item.image,
            onClick: () => connectRouter(item),
            category: item.category,
          };
        })
        .filter(Boolean) as any).sort(
        (a, b) => getSortNum(a.brand) - getSortNum(b.brand)
      ),
    [t, connectRouter]
  );

  const wallets = React.useMemo(() => _.groupBy(brandWallet, 'category'), [
    brandWallet,
  ]);

  const renderList = React.useMemo(
    () =>
      [
        {
          title: t('page.newAddress.connectHardwareWallets'),
          key: WALLET_BRAND_CATEGORY.HARDWARE,
          icon: IconHardWallet,
        },
        {
          title: t('page.newAddress.connectMobileWalletApps'),
          key: WALLET_BRAND_CATEGORY.MOBILE,
          icon: IconMobileWallet,
        },
        {
          title: t('page.newAddress.connectInstitutionalWallets'),
          key: WALLET_BRAND_CATEGORY.INSTITUTIONAL,
          icon: InstitutionalWallet,
        },
      ]
        .map((item) => {
          return {
            ...item,
            values: wallets[item.key],
          };
        })
        .filter((item) => item.values),
    [wallets]
  );

  const createIMportAddrList = React.useMemo(
    () => [
      {
        leftIcon: IconCreatenewaddr,
        content: t('page.newAddress.createNewSeedPhrase'),
        brand: 'createAddress',
        onClick: () => {
          handleRouter(() => openInternalPageInTab('mnemonics/create'));
        },
      },
    ],
    [t]
  );

  const centerList = React.useMemo(
    () => [
      {
        leftIcon: IconMnemonics,
        brand: 'importSeedPhrase',
        content: t('page.newAddress.importSeedPhrase'),
        onClick: () =>
          handleRouter(() => openInternalPageInTab('import/mnemonics')),
      },
      {
        leftIcon: IconPrivatekey,
        brand: 'importPrivatekey',
        content: t('page.newAddress.importPrivateKey'),
        onClick: () => handleRouter((history) => history.push('/import/key')),
      },
      {
        leftIcon: IconMetamask,
        brand: 'addMetaMaskAccount',
        content: t('page.newAddress.importMyMetamaskAccount'),
        onClick: () =>
          handleRouter((history) => history.push('/import/metamask')),
      },
    ],
    []
  );

  const bottomList = React.useMemo(
    () => [
      {
        leftIcon: IconAddwatchmodo,
        brand: 'addWatchMode',
        content: t('page.newAddress.addContacts.content'),
        subText: t('page.newAddress.addContacts.description'),
        onClick: () =>
          handleRouter((history) => history.push('/import/watch-address')),
      },
    ],
    [t]
  );

  const [preventMount, setPreventMount] = React.useState(true);
  React.useEffect(() => {
    if (location.state) {
      const { type, address, chainId } = location.state as any;
      const brandContentKey = Object.keys(WALLET_BRAND_CONTENT).find((key) => {
        const item = WALLET_BRAND_CONTENT[key] as IWalletBrandContent;
        return item.name === type;
      });

      if (brandContentKey) {
        connectRouter(WALLET_BRAND_CONTENT[brandContentKey], {
          address,
          chainId,
        });
      } else {
        setPreventMount(false);
      }
    } else {
      setPreventMount(false);
    }
  }, [location.state, connectRouter]);

  if (preventMount) return null;

  return (
    <div className="rabby-container pb-[12px]" ref={rootRef}>
      {[createIMportAddrList, centerList].map((items, index) => (
        <div className="bg-white rounded-[6px] mb-[12px]" key={index}>
          {items.map((e) => {
            return (
              <Item key={e.brand} leftIcon={e.leftIcon} onClick={e.onClick}>
                <div className="pl-[12px] text-13 leading-[15px] text-r-neutral-title-1 font-medium">
                  {e.content}
                </div>
              </Item>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default connectStore()(AddAddressOptions);
