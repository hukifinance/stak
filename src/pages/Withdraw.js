import React from 'react';
import * as ethers from 'ethers';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';
import { Box, Paper, Button, TextField } from '@material-ui/core';
import { useWallet } from 'contexts/wallet';
import { useNotifications } from 'contexts/notifications';
import { formatUnits } from 'utils/big-number';
import { BORDER_RADIUS, EMPTY_CALL_DATA } from 'config';

export const useStyles = makeStyles(theme => ({
  container: {
    '& a': {
      color: theme.palette.secondary.main,
    },
    '& .MuiInputLabel-shrink': {
      right: 0,
      transform: 'translate(0, 1.5px) scale(1)',
      transformOrigin: 'top left',
      fontSize: 12,
    },
  },
  maxButton: {
    height: 35,
  },
  withdrawButton: {
    width: 200,
  },
  rewards: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    padding: 20,
    borderRadius: BORDER_RADIUS,
    background: '#555',
    color: 'white',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    columnGap: '10px',
  },
}));

export default function() {
  const classes = useStyles();

  const {
    startConnecting: startConnectingWallet,
    signer,
    address,
    stakingContract,
    lpContract,
    lpDecimals,
    lpName,
  } = useWallet();

  const [isWithdrawing, setIsWithdrawing] = React.useState(false);

  const [monthlyDittoRewards] = React.useState(ethers.BigNumber.from('0'));
  const [monthlyCakeRewards] = React.useState(ethers.BigNumber.from('0'));

  const [totalStakedFor, setTotalStakedFor] = React.useState(
    ethers.BigNumber.from('0')
  );

  const { showTxNotification, showErrorNotification } = useNotifications();
  const [amountInput, setAmountInput] = React.useState(0);
  const [withdrawMaxAmount, setWithdrawMaxAmount] = React.useState(false);
  const amount = React.useMemo(() => {
    try {
      return ethers.utils.parseUnits(amountInput.toString(), lpDecimals);
    } catch {
      return ethers.BigNumber.from('0');
    }
  }, [amountInput, lpDecimals]);

  const onConnectOrWithdraw = async () => {
    !signer ? startConnectingWallet() : withdraw();
  };

  const withdraw = async () => {
    try {
      const maxWithdrawAmount = await stakingContract.totalStakedFor(address);
      const withdrawAmount = withdrawMaxAmount ? maxWithdrawAmount : amount;
      if (!withdrawMaxAmount && withdrawAmount.gt(maxWithdrawAmount)) {
        return showErrorNotification(
          'You are trying to withdrawing more than you deposited.'
        );
      }
      setIsWithdrawing(true);
      const tx = await stakingContract.unstake(withdrawAmount, EMPTY_CALL_DATA);
      showTxNotification(`Withdrawing ${lpName}`, tx.hash);
      await tx.wait();
      showTxNotification(`Withdrew ${lpName}`, tx.hash);
      await onSetWithdrawMaxAmount();
    } catch (e) {
      showErrorNotification(e);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const onSetWithdrawAmount = e => {
    setWithdrawMaxAmount(false);
    setAmountInput(e.target.value);
  };

  const onSetWithdrawMaxAmount = async () => {
    if (!(stakingContract && address)) return;
    const totalStakedFor = await stakingContract.totalStakedFor(address);
    setTotalStakedFor(totalStakedFor);
    setAmountInput(formatUnits(totalStakedFor, 18));
    setWithdrawMaxAmount(true);
  };

  React.useEffect(() => {
    onSetWithdrawMaxAmount();
  }, [stakingContract, address]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={classes.container}>
      {!lpName ? null : (
        <div className={'flex'}>
          <TextField
            id="amount"
            value={amountInput}
            label={
              <div className="flex flex-grow justify-space">
                <div className="flex-grow">Withdraw Amount ({lpName})</div>
                <div>
                  Deposited: {formatUnits(totalStakedFor, 18)} {lpName}
                </div>
              </div>
            }
            type="number"
            step="any"
            className={classes.input}
            InputLabelProps={{
              shrink: true,
            }}
            fullWidth
            onChange={onSetWithdrawAmount}
          />

          <Box className="flex items-end" pl={2}>
            <Button
              color="default"
              variant="outlined"
              onClick={onSetWithdrawMaxAmount}
              disabled={!(lpContract && address)}
              className={classes.maxButton}
            >
              MAX
            </Button>
          </Box>
        </div>
      )}

      <Box mt={2} className={classes.stats}>
        <Paper className={clsx(classes.rewards)}>
          <div>Amount to Withdraw:</div>
          <div>
            {formatUnits(totalStakedFor, 18)} {lpName}
          </div>
        </Paper>

        <Paper className={clsx(classes.rewards)}>
          <div>Rewards Claimed:</div>
          <div>{formatUnits(monthlyDittoRewards, 18)} DITTO</div>
          <div>{formatUnits(monthlyCakeRewards, 18)} CAKE</div>
        </Paper>
      </Box>

      <Box mt={2}>
        <Button
          color="secondary"
          variant="contained"
          disabled={isWithdrawing}
          onClick={onConnectOrWithdraw}
          className={classes.withdrawButton}
        >
          {isWithdrawing
            ? 'Withdrawing...'
            : !signer
            ? 'Connect Wallet'
            : 'Withdraw'}
        </Button>
      </Box>
    </div>
  );
}