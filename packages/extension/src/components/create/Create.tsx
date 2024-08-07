import React, { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { Box, Button, Avatar, VStack, Text } from "@chakra-ui/react";
import { WumboDrawer } from "../WumboDrawer";
import { routes } from "@/constants/routes";
import { useQuery, SOL_TOKEN, useUserInfo } from "wumbo-common";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolPrice } from "@strata-foundation/react";
import ClaimOrCreate from "./ClaimOrCreate";

export const Create = () => {
  const location = useLocation();
  const query = useQuery();
  const { connected, publicKey } = useWallet();
  const currentPath = `${location.pathname}${location.search}`;
  const solPrice = useSolPrice();
  const { userInfo, loading } = useUserInfo(query.get("name")!);

  return (
    <Fragment>
      <WumboDrawer.Header title="Create Coin" />
      <WumboDrawer.Content>
        <VStack spacing={4} padding={4}>
          <Box
            d="flex"
            w="full"
            alignItems="center"
            bg="gray.100"
            rounded="lg"
            padding={4}
          >
            <Avatar size="md" bg="indigo.500" src={query.get("img")!} />
            <Box
              d="flex"
              flexGrow={1}
              justifyContent="space-between"
              marginLeft={4}
            >
              <Text fontSize="xl" fontWeight="medium">
                {query.get("name")!}
              </Text>
              <Text fontSize="xl" fontWeight="medium">
                $0.00
              </Text>
            </Box>
          </Box>
          {!userInfo && !loading && (
            <VStack spacing={2} w="full">
              <Text fontWeight="bold">
                If this is your twitter account, you can create your token or
                link your wallet to Wum.bo for free.
              </Text>
              <Text>
                If this is someone else's twitter account, you can create and
                begin trading a token that they will have the option to claim
                later.
              </Text>
              <Text>
                Should the person opt out, no new tokens may be purchased and
                exisiting tokens may still be sold. It costs 0.03 SOL (~$
                {solPrice ? (solPrice * 0.03).toFixed(2) : ""}) to do this.
              </Text>
            </VStack>
          )}
          {connected && publicKey ? (
            <ClaimOrCreate />
          ) : (
            <Button
              as={Link}
              to={routes.manageWallet.path + `?redirect=${currentPath}`}
              size="md"
              w="full"
              colorScheme="indigo"
            >
              Connect Wallet
            </Button>
          )}
        </VStack>
      </WumboDrawer.Content>
      <WumboDrawer.Nav />
    </Fragment>
  );
};
