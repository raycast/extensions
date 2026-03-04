import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { LoginForm } from "./components/LoginForm";
import { LoginItem } from "./components/LoginItem";
import { PortfolioDropdown } from "./components/PortfolioDropdown";
import { HoldingsSection } from "./components/stocks/HoldingsSection";
import { MarginsSection } from "./components/stocks/MarginsSection";
import { OrdersSection } from "./components/stocks/OrdersSection";
import { PositionsSection } from "./components/stocks/PositionsSection";
import { MFHoldingsSection } from "./components/mutualfunds/MFHoldingsSection";
import { MFOrdersSection } from "./components/mutualfunds/MFOrdersSection";
import { SIPsSection } from "./components/mutualfunds/SIPsSection";
import { useAuth } from "./hooks/useAuth";
import { useMutualFunds } from "./hooks/useMutualFunds";
import { usePortfolio } from "./hooks/usePortfolio";
import { COPY } from "./lib/constants";
import { PortfolioView } from "./lib/types";

export default function ZerodhaPortfolio() {
  const [view, setView] = useState<PortfolioView>("stocks");
  const auth = useAuth();
  const portfolio = usePortfolio(auth.accessToken, auth.isLoggedIn);
  const mf = useMutualFunds(auth.accessToken, auth.isLoggedIn);

  const isLoading =
    auth.isLoading || (view === "stocks" ? portfolio.isLoading : mf.isLoading);

  // State 1: No token at all (first run)
  const hasNoToken = !auth.isLoading && !auth.accessToken;

  // State 4: Token exists but expired
  const hasExpiredToken =
    !auth.isLoading && !!auth.accessToken && auth.isExpired;

  // Determine if we have any cached data to show
  const hasCachedStocks =
    portfolio.holdings.length > 0 ||
    portfolio.positions.length > 0 ||
    portfolio.orders.length > 0;
  const hasCachedMF =
    mf.mfHoldings.length > 0 || mf.sips.length > 0 || mf.mfOrders.length > 0;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search portfolio..."
      searchBarAccessory={<PortfolioDropdown value={view} onChange={setView} />}
    >
      {/* State 1: First run — no token, no cached data */}
      {hasNoToken && !hasCachedStocks && !hasCachedMF && (
        <List.EmptyView
          icon={Icon.Key}
          title={COPY.LOGIN_TITLE}
          description={COPY.LOGIN_DESCRIPTION}
          actions={
            <ActionPanel>
              <Action.Push
                title={COPY.LOGIN_ACTION}
                icon={Icon.Key}
                target={
                  <LoginForm
                    onSuccess={auth.onLoginSuccess}
                    storedUserId={auth.userId}
                    rememberedUserId={auth.rememberedUserId}
                  />
                }
              />
            </ActionPanel>
          }
        />
      )}

      {/* State 4: Expired token — show login banner + cached data */}
      {(hasExpiredToken ||
        (hasNoToken && (hasCachedStocks || hasCachedMF))) && (
        <LoginItem
          onLoginSuccess={auth.onLoginSuccess}
          storedUserId={auth.userId}
          rememberedUserId={auth.rememberedUserId}
          lastSynced={
            view === "stocks" ? portfolio.lastUpdated : mf.lastUpdated
          }
          onLogout={auth.logout}
        />
      )}

      {/* Stock sections */}
      {view === "stocks" && (
        <>
          <HoldingsSection
            holdings={portfolio.holdings}
            lastUpdated={portfolio.lastUpdated}
            isLoggedIn={auth.isLoggedIn}
            onRefresh={portfolio.refresh}
            onLogout={auth.logout}
          />
          <PositionsSection
            positions={portfolio.positions}
            isLoggedIn={auth.isLoggedIn}
            onRefresh={portfolio.refresh}
            onLogout={auth.logout}
          />
          <OrdersSection
            orders={portfolio.orders}
            isLoggedIn={auth.isLoggedIn}
            onRefresh={portfolio.refresh}
            onLogout={auth.logout}
          />
          <MarginsSection
            margins={portfolio.margins}
            isLoggedIn={auth.isLoggedIn}
            onRefresh={portfolio.refresh}
            onLogout={auth.logout}
          />
          {/* Empty state for stocks when logged in but no data */}
          {auth.isLoggedIn && !portfolio.isLoading && !hasCachedStocks && (
            <List.EmptyView
              icon={Icon.LineChart}
              title={COPY.EMPTY_HOLDINGS_TITLE}
              description={COPY.EMPTY_HOLDINGS_DESCRIPTION}
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={portfolio.refresh}
                  />
                  <Action
                    title="Logout"
                    icon={Icon.Logout}
                    onAction={auth.logout}
                  />
                </ActionPanel>
              }
            />
          )}
        </>
      )}

      {/* Mutual Fund sections */}
      {view === "mutualfunds" && (
        <>
          <MFHoldingsSection
            holdings={mf.mfHoldings}
            lastUpdated={mf.lastUpdated}
            isLoggedIn={auth.isLoggedIn}
            onRefresh={mf.refresh}
            onLogout={auth.logout}
          />
          <SIPsSection
            sips={mf.sips}
            isLoggedIn={auth.isLoggedIn}
            onRefresh={mf.refresh}
            onLogout={auth.logout}
          />
          <MFOrdersSection
            orders={mf.mfOrders}
            isLoggedIn={auth.isLoggedIn}
            onRefresh={mf.refresh}
            onLogout={auth.logout}
          />
          {/* Empty state for MF when logged in but no data */}
          {auth.isLoggedIn && !mf.isLoading && !hasCachedMF && (
            <List.EmptyView
              icon={Icon.BankNote}
              title={COPY.EMPTY_MF_TITLE}
              description={COPY.EMPTY_MF_DESCRIPTION}
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={mf.refresh}
                  />
                  <Action
                    title="Logout"
                    icon={Icon.Logout}
                    onAction={auth.logout}
                  />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}
