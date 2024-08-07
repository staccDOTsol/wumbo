import { useTokenRefForName } from "@strata-foundation/react";
import { routes, viewProfilePath } from "@/constants/routes";
import { useDrawer } from "@/contexts/drawerContext";
import { Button, ButtonProps, SpinnerProps } from "@chakra-ui/react";
import React, { FC } from "react";
import { Link } from "react-router-dom";
import {
  PriceButton,
  Spinner,
  useTwitterOwner,
  useTwitterTld,
} from "wumbo-common";

type Props = {
  creatorName: string;
  creatorImg: string;
  btnProps?: ButtonProps;
  spinnerProps?: SpinnerProps;
  buttonTarget?: HTMLElement;
};

export const MainButton: FC<Props> = ({
  creatorName,
  creatorImg,
  btnProps = {},
  spinnerProps = {},
  buttonTarget,
}: Props) => {
  const { toggleDrawer } = useDrawer();
  const tld = useTwitterTld();
  const { info: tokenRef, loading } = useTokenRefForName(
    creatorName,
    null,
    tld
  );
  const { owner, loading: loadingOwner } = useTwitterOwner(creatorName);

  if (!(loading || loadingOwner) && !tokenRef) {
    return (
      <Button
        as={Link}
        to={
          (owner ? routes.profile.path : routes.create.path) +
          `?name=${creatorName}&src=${creatorImg}`
        }
        size="xs"
        fontFamily="body"
        colorScheme="indigo"
        variant="outline"
        _hover={{ bg: "indigo.900" }}
        _active={{ bg: "indigo.900" }}
        _focus={{ boxShadow: "none" }}
        borderWidth="2px"
        onClick={() => {
          toggleDrawer({
            isOpen: true,
            creator: { name: creatorName, img: creatorImg },
          });
        }}
        {...btnProps}
      >
        {owner ? "View" : "Mint"}
      </Button>
    );
  }

  if (loading || !tokenRef) {
    return <Spinner size="sm" {...spinnerProps} />;
  }

  return (
    <PriceButton
      optedOut={!!tokenRef.isOptedOut as boolean}
      buttonTarget={buttonTarget}
      {...(btnProps as any)}
      {...(btnProps.borderRadius == "full"
        ? {
            r: 100,
            h: "36px",
          }
        : {})}
      link={`${routes.profile.path}?name=${creatorName}`}
      onClick={() =>
        toggleDrawer({
          isOpen: true,
          creator: { name: creatorName, img: creatorImg },
        })
      }
      tokenBonding={tokenRef.tokenBonding}
      mint={tokenRef.mint}
    />
  );
};
