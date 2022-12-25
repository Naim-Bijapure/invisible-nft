import { Avatar, Divider, List, Skeleton, Typography } from "antd";
import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";

import { useRef } from "react";
import { AddressInput } from "../components";

const { Title, Paragraph } = Typography;

function Home({ readContracts, localProvider, mainnetProvider }) {
  // default load 5 pages
  const LOAD_COUNT = 5;

  const [tokenList, setTokenList] = useState([]);
  const [tokenURIs, setTokenURIs] = useState([]);
  const [address, setAddress] = useState(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState(undefined);
  const pageCountRef = useRef(0);

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

  // load nft token uris
  const loadNFTs = async () => {
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

  useEffect(() => {
    if (
      address !== undefined &&
      ethers.utils.isAddress(address) &&
      localProvider &&
      "casterContract" in readContracts &&
      "shadowNFT" in readContracts
    ) {
      void loadNFTs();
    }

    if (!address) {
      setTokenList([]);
    }
  }, [localProvider, readContracts, address]);

  useEffect(() => {
    if (tokenURIs.length > 0) {
      void onLoadMore();
    }
  }, [tokenURIs]);

  const onLoadMore = async () => {
    if (isLoading) {
      return;
    }
    const tokenData = [];
    setIsLoading(true);

    // load nft tokens async
    const fromIndex = pageCountRef.current === 0 ? pageCountRef.current : pageCountRef.current + 1;
    const toIndex = pageCountRef.current + LOAD_COUNT;

    // parse token uri json
    for (const tokenURI of tokenURIs.slice(fromIndex, toIndex + 1)) {
      let rawData;
      try {
        rawData = await readContracts["shadowNFT"].tokenURI(tokenURI);

        rawData = rawData.replace("data:application/json;charset=utf-8,", "");
        let jsonData = JSON.parse(rawData);
        jsonData.loading = false;

        tokenData.push(jsonData);
      } catch (error) {
        console.log(`n-🔴 => loadNFTs => error`, error);
        continue;
      }
    }

    setTokenList(prev => [...prev, ...tokenData]);
    setIsLoading(false);
    pageCountRef.current = balance === pageCountRef.current ? balance : pageCountRef.current + LOAD_COUNT;
  };

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
            <span className="opacity-60">{balance} invisible nft's found</span>
          </div>
        )}
      </div>

      <div className="w-1/2 mt-10">
        <div id="scrollableDiv" className="overflow-auto w-full max-h-96">
          <InfiniteScroll
            dataLength={tokenList.length}
            next={onLoadMore}
            hasMore={balance ? Number(balance) !== Number(pageCountRef.current) : ""}
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
                <List.Item key={item.email}>
                  <List.Item.Meta
                    avatar={<Avatar size={120} src={item.image} />}
                    title={<div className="mt-3">{item.name}</div>}
                    description={item.description}
                  />
                </List.Item>
              )}
            />
          </InfiniteScroll>
        </div>
      </div>
    </div>
  );
}

export default Home;
