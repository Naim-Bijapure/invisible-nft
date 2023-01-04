import { Avatar, Divider, List, Skeleton, Typography, Button, Tooltip } from "antd";

import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";

import { useRef } from "react";
import namehash from "eth-ens-namehash";

import mainnetNft from "../abi's/mainnetNFT.json";
import { AddressInput } from "../components";
import EnsGoerli from "../abi's/ENS_Goerli.json";
import EnsMainnet from "../abi's/ENS_Mainnet.json";

const { Title, Paragraph } = Typography;

const ENS_RESOLVER_GOERLI = "0xE264d5bb84bA3b8061ADC38D3D76e6674aB91852";
const ENS_RESOLVER_MAINNET = "0x4976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41";

const shadowAddresses = [
  //FIXME:mainnet chain address
  { name: "ENS Adventurer Avatar", address: "0x52f3ef977109d3ccaaacd89685a6400ad3606b96" },
  { name: "ENS Cat Avatars", address: "0x3be7b78a0677f95539c3aca821888b1a534afd68" },
  { name: "ENS Adventurer Neutral Avatar", address: "0xfd1c6a720af44e021a89d0521cccbf1e1060e843" },
  { name: "ENS Big Ears Avatar", address: "0x55D5F37F0DE6Acc94380C58255E8321e66288577" },
  { name: "ENS Big Smile Avatar", address: "0x998e83b3945b093744b841ddd9ad8e3ba9d66642" },
  { name: "ENS Croodles Avatar", address: "0x1e9d3697b7523fe17dec76b175c9bf424f4663ea" },
  { name: "ENS Micah Avatars", address: "0xb98d1d24a6eb4a92418595b8f06edb322075d8df" },
  { name: "ENS Open Peeps Avatars", address: "0x5784953dbeb3a764761b5bffe0f32e9c14e32482" },
  { name: "ENS Miniavs Avatars", address: "0x5A325AC1b2807825BDDecF8393Ff8eE5FE3EbA37" },
  { name: "ENS Robohash Monster Avatars", address: "0xc5d5859a6022c174b2ccabe2f92d7c5a1503f4cb" },
  { name: "On-chain Blockies", address: "0x7e902c638db299307565062dc7cd0397431bcb11" },

  //FIXME:mainnet chain address
  // goerli addrss
  // { name: "ENS Robohash Monster Avatars", address: "0xd4967857472c915bB2C66FD48095F1FAaC85B2C9" },
];

function Home({ address, readContracts, localProvider, mainnetProvider, userSigner, tx }) {
  // default load 5 pages
  const LOAD_COUNT = 1;

  const [tokenList, setTokenList] = useState([]);
  const [tokenURIs, setTokenURIs] = useState([]);
  const [searchAddress, setSearchAddress] = useState(undefined);
  console.log(`n-🔴 => Home => searchAddress`, searchAddress);
  const [balance, setBalance] = useState(undefined);
  const [toggleLoadMore, setToggleLoadMore] = useState(false);
  const [ensName, setEnsName] = useState(undefined);
  const pageCountRef = useRef(0);

  /**
   methods
  */

  // filter unique token uris
  const filterTokenURIs = async logs => {
    function addressEqual(a, b) {
      return a.toLowerCase() === b.toLowerCase();
    }

    const owned = new Set();

    for (const {
      args: { from, to, tokenId },
    } of logs) {
      if (addressEqual(to, searchAddress)) {
        owned.add(tokenId.toString());
      } else if (addressEqual(from, searchAddress)) {
        owned.delete(tokenId.toString());
      }
    }

    return [...owned];
  };

  /**
   get shadow json data for each shadow contract
  */
  const getShadowNFTjson = async tokenURI => {
    let rawData;
    let finaJsonData = [];

    for (const { address } of shadowAddresses) {
      let shadowContract = new ethers.Contract(address, mainnetNft[1].mainnet.contracts.shadowNFT.abi, localProvider);

      try {
        rawData = await shadowContract.tokenURI(tokenURI);

        rawData = rawData.replace("data:application/json;charset=utf-8,", "");
        let jsonData = JSON.parse(rawData);
        jsonData.tokenURI = tokenURI;
        jsonData.tokenAddress = address;
        jsonData.loading = false;
        // console.log(`n-🔴 => getShadowNFTjson => jsonData`, jsonData);

        finaJsonData.push(jsonData);
      } catch (error) {
        console.log(`n-🔴 => loadNFTs => error`, error);
        break;
      }
    }

    return finaJsonData;
  };

  // load nft token uris
  const loadTokenURIs = async () => {
    let balance = await readContracts["casterContract"].balanceOf(searchAddress);
    setBalance(Number(balance.toString()));
    const filterTo = readContracts["casterContract"].filters.Transfer(null, searchAddress);
    const filterFrom = readContracts["casterContract"].filters.Transfer(searchAddress);

    const queryEventsTo = await readContracts["casterContract"].queryFilter(filterTo);
    const queryEventsFrom = await readContracts["casterContract"].queryFilter(filterFrom);

    const logs = queryEventsFrom
      .concat(queryEventsTo)
      .sort((a, b) => a.blockNumber - b.blockNumber || a.transactionIndex - b.transactionIndex);

    const tokenURIs = await filterTokenURIs(logs);
    // console.log(`n-🔴 => loadTokenURIs => tokenURIs`, tokenURIs);

    setTokenURIs(tokenURIs);
  };

  const onLoadMore = async () => {
    if (balance <= LOAD_COUNT) {
      setTokenList([{ loading: true }]);
    }

    // setIsLoading(true);
    const tokenData = [];

    pageCountRef.current = balance === pageCountRef.current ? balance : pageCountRef.current + LOAD_COUNT;

    // load nft tokens async
    const fromIndex = pageCountRef.current === 0 ? pageCountRef.current : pageCountRef.current - 1;
    const toIndex = pageCountRef.current;
    let isEmpty = false;

    // parse token uri json
    for (const tokenURI of tokenURIs.slice(fromIndex, toIndex)) {
      let nftJsonData = await getShadowNFTjson(tokenURI);
      if (nftJsonData.length > 0) {
        tokenData.push(nftJsonData);
      } else {
        isEmpty = true;
      }
    }

    if (isEmpty) {
      setToggleLoadMore(!toggleLoadMore);
      return;
    }
    setTokenList(prev => [...prev, ...tokenData.flat()].filter(data => data.loading === false));
  };

  const onVisibleNFT = async item => {
    let shadowContract = new ethers.Contract(
      item.tokenAddress,
      mainnetNft[1].mainnet.contracts.shadowNFT.abi,
      userSigner,
    );

    const selfTransferEventTx = tx(shadowContract.emitSelfTransferEvent(item.tokenURI), update => {
      console.log("📡 Transaction Update:", update);
      if (update && (update.status === "confirmed" || update.status === 1)) {
        console.log("🍾 Transaction " + update.hash + " finished!");
      }
    });
    const selfTransferEventRcpt = await selfTransferEventTx;
  };

  const onSetProfile = async item => {
    console.log(`n-🔴 => onSetProfile => item`, item);

    //FIXME:mainnet chain address
    const ENSContract = new ethers.Contract(ENS_RESOLVER_MAINNET, EnsMainnet.abi, userSigner);
    // const ENSContract = new ethers.Contract(ENS_RESOLVER_GOERLI, EnsGoerli.abi, userSigner);
    var ensName = await localProvider.lookupAddress(searchAddress);

    const node = namehash.hash(ensName);
    // set record formate eg:
    // eip155:1/[NFT standard]:[contract address for NFT collection]/[token ID or the number that it is in the collection]
    // eip155:1/erc721:0x55d5f37f0de6acc94380c58255e8321e66288577/19874724432705593828830788763869663074267578667212763671097794968539576690602

    const nftData = `eip155:1/erc721:${item.tokenAddress}/${item.tokenURI}`;

    const setTextTx = tx(ENSContract.setText(node, "avatar", nftData), update => {
      console.log("📡 Transaction Update:", update);
      if (update && (update.status === "confirmed" || update.status === 1)) {
        console.log("🍾 Transaction " + update.hash + " finished!");
      }
    });
    const setTextTxRcpt = await setTextTx;
  };

  const getEnsName = async address => {
    var ensName = await localProvider.lookupAddress(address);
    setEnsName(ensName);
  };

  const getEnsAddress = async ensName => {
    var address = await localProvider.resolveName(ensName);
    setSearchAddress(address);
  };

  /**
   useEffects
  */

  /**
  load token uris when input address
 */
  useEffect(() => {
    if (
      searchAddress !== undefined &&
      ethers.utils.isAddress(searchAddress) &&
      localProvider &&
      "casterContract" in readContracts &&
      "shadowNFT" in readContracts
    ) {
      setTokenList([{ loading: true }]);
      void loadTokenURIs();
    }

    if (!searchAddress) {
      setTokenList([]);
      setBalance(undefined);
      pageCountRef.current = 0;
    }
  }, [localProvider, readContracts, searchAddress]);

  // load default wallet connected address
  useEffect(() => {
    if (address && readContracts && localProvider) {
      setSearchAddress(address);
    }
  }, [localProvider, readContracts, address]);

  // load  default nick.eth address
  useEffect(() => {
    if (address === undefined && readContracts && localProvider) {
      getEnsAddress("nick.eth");
    }
  }, [localProvider, readContracts, address]);

  useEffect(() => {
    if (searchAddress && ethers.utils.isAddress(searchAddress)) {
      getEnsName(searchAddress);
    }
  }, [searchAddress]);

  useEffect(() => {
    if (ensName === null) {
      setTokenList([]);
    }
  }, [ensName]);

  /**
   on token uri load   tokens at start
  */
  useEffect(() => {
    if (tokenURIs.length > 0) {
      void onLoadMore();
    }
  }, [tokenURIs]);

  useEffect(() => {
    void onLoadMore();
  }, [toggleLoadMore]);

  return (
    <div className="scrollHeight overflow-auto" id="scrollableDiv">
      {/* <Button
        onClick={async () => {

          // let addrsss = await mainnetProvider.resolveName("ricmoo.eth");
          // console.log(`n-🔴 => onClick={ => addrsss`, addrsss);
          // const resolver = await mainnetProvider.getResolver("avsa.eth");
          // console.log(`n-🔴 => resolver`, resolver);
          // console.log(`n-🔴 => avatar`, avatar);
          // const avatarMetaData = await resolver.getText("avatar");
          // console.log(`Avatar Metadata: ${avatarMetaData}`);
        }}
      >
        test
      </Button> */}
      <InfiniteScroll
        dataLength={tokenList.length}
        next={onLoadMore}
        hasMore={balance && balance >= LOAD_COUNT ? Number(balance) !== Number(pageCountRef.current) : false}
        loader={
          <div className="flex flex-col items-center w-full">
            <div className="w-1/2">
              <Skeleton
                avatar
                title
                paragraph={{
                  rows: 1,
                }}
                active
              />
            </div>
          </div>
        }
        endMessage={
          balance !== undefined &&
          ensName !== null && (
            <div className="flex flex-col items-center w-full">
              <div className="w-1/2">
                <Divider plain className="opacity-70">
                  loaded all nft's
                </Divider>
              </div>
            </div>
          )
        }
        scrollableTarget="scrollableDiv"
      >
        <div className="flex flex-col items-center w-full">
          <div className="w-1/2">
            <Title level={2}>Invisible NFT's</Title>
            <Paragraph className="opacity-70">
              Lorem ipsum dolor sit amet consectetur, adipisicing elit. Non deleniti, vitae quo cumque, laboriosam minus
              iste illo, dolores consequatur at quibusdam! Praesentium veniam eum hic dicta optio doloremque obcaecati
              tenetur!
            </Paragraph>
          </div>

          <div className="w-1/2 mt-5">
            <AddressInput
              placeholder="enter ens address"
              autoFocus
              // ensProvider={localProvider}
              //FIXME:mainnet chain address
              ensProvider={mainnetProvider}
              address={searchAddress}
              onChange={setSearchAddress}
              // disabled={!address}
            />
            {balance !== undefined && ensName !== undefined && (
              <div className="mt-2">
                <span className="opacity-60">
                  {balance * shadowAddresses.length} invisible nft's found for{" "}
                  <span className="text-blue-500"> {ensName === null ? address : ensName}</span>
                </span>
                {address === undefined && (
                  <span className="text-yellow-500 mr-2"> (connect wallet to set profile)</span>
                )}
              </div>
            )}
          </div>

          <div className="w-1/2 mt-10">
            {/* TOKEN LIST */}
            <List
              dataSource={tokenList}
              renderItem={item => (
                <Skeleton
                  avatar
                  title
                  paragraph={{
                    rows: 1,
                  }}
                  active
                  loading={item.loading}
                >
                  <List.Item
                    key={item.image}
                    actions={[
                      // address === searchAddress && (
                      address !== undefined && (
                        <Tooltip title="Make this NFT visible on your account at opensea">
                          <Button type="link" onClick={() => onVisibleNFT(item)}>
                            set visible
                          </Button>
                        </Tooltip>
                      ),
                      address === searchAddress && (
                        <Tooltip title="Set this NFT as ENS avatar">
                          <Button type="link" onClick={() => onSetProfile(item)}>
                            set profile
                          </Button>
                        </Tooltip>
                      ),
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar size={120} src={item.image} />}
                      title={<div className="mt-3">{item.name}</div>}
                      description={item.description}
                    />
                  </List.Item>
                </Skeleton>
              )}
            />

            {/* {!address && (
              <>
                <div className="text-center text-lg text-red-500">Connect with wallet !</div>
              </>
            )} */}
          </div>
        </div>
      </InfiniteScroll>
    </div>
  );
}

export default Home;
