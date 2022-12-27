import { Avatar, Divider, List, Skeleton, Typography } from "antd";

import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";

import { useRef } from "react";
import mainnetNft from "../abi's/mainnetNFT.json";
import { AddressInput } from "../components";

const { Title, Paragraph } = Typography;

const shadowAddresses = [
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
  // { name: "On-chain Blockies", address: "0x7e902c638db299307565062dc7cd0397431bcb11" },
];

function Home({ readContracts, localProvider, mainnetProvider }) {
  // default load 5 pages
  const LOAD_COUNT = 1;

  const [tokenList, setTokenList] = useState([]);
  const [tokenURIs, setTokenURIs] = useState([]);
  const [address, setAddress] = useState(undefined);
  // const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState(undefined);
  const [toggleLoadMore, setToggleLoadMore] = useState(false);
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
      if (addressEqual(to, address)) {
        owned.add(tokenId.toString());
      } else if (addressEqual(from, address)) {
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
        jsonData.loading = false;

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
    let balance = await readContracts["casterContract"].balanceOf(address);
    setBalance(Number(balance.toString()));
    const filterTo = readContracts["casterContract"].filters.Transfer(null, address);
    const filterFrom = readContracts["casterContract"].filters.Transfer(address);

    const queryEventsTo = await readContracts["casterContract"].queryFilter(filterTo);
    const queryEventsFrom = await readContracts["casterContract"].queryFilter(filterFrom);

    const logs = queryEventsFrom
      .concat(queryEventsTo)
      .sort((a, b) => a.blockNumber - b.blockNumber || a.transactionIndex - b.transactionIndex);

    const tokenURIs = await filterTokenURIs(logs);

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

  /**
   useEffects
  */

  /**
  load token uris when input address
 */
  useEffect(() => {
    if (
      address !== undefined &&
      ethers.utils.isAddress(address) &&
      localProvider &&
      "casterContract" in readContracts &&
      "shadowNFT" in readContracts
    ) {
      setTokenList([{ loading: true }]);
      void loadTokenURIs();
    }

    if (!address) {
      setTokenList([]);
      setBalance(undefined);
      pageCountRef.current = 0;
    }
  }, [localProvider, readContracts, address]);

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
    <div className="flex flex-col items-center ">
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
          ensProvider={mainnetProvider}
          address={address}
          onChange={setAddress}
        />
        {balance !== undefined && (
          <div className="mt-2">
            <span className="opacity-60">{balance * shadowAddresses.length} invisible nft's found</span>
          </div>
        )}
      </div>

      <div className="w-1/2 mt-10">
        <div id="scrollableDiv" className="overflow-auto w-full max-h-96">
          <InfiniteScroll
            dataLength={tokenList.length}
            next={onLoadMore}
            hasMore={balance && balance >= LOAD_COUNT ? Number(balance) !== Number(pageCountRef.current) : false}
            loader={
              <Skeleton
                avatar
                title
                paragraph={{
                  rows: 1,
                }}
                active
              />
            }
            endMessage={
              balance !== undefined && (
                <Divider plain className="opacity-70">
                  loaded all nft's
                </Divider>
              )
            }
            scrollableTarget="scrollableDiv"
          >
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
                  <List.Item key={item.image}>
                    <List.Item.Meta
                      avatar={<Avatar size={120} src={item.image} />}
                      title={<div className="mt-3">{item.name}</div>}
                      description={item.description}
                    />
                  </List.Item>
                </Skeleton>
              )}
            />
          </InfiniteScroll>
        </div>
      </div>
    </div>
  );
}

export default Home;
