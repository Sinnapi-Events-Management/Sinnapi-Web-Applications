'use client';
import { Fragment } from 'react';
import { Avatar, Box, Divider, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { PortalAccount } from './types';

export interface PortalAccountMenuProps {
  account: PortalAccount;
  anchorEl: HTMLElement | null;
  onOpen: (e: React.MouseEvent<HTMLElement>) => void;
  onClose: () => void;
}

/** Avatar button plus the account menu: identity header then app-supplied items. */
export function PortalAccountMenu({ account, anchorEl, onOpen, onClose }: PortalAccountMenuProps) {
  return (
    <>
      <IconButton onClick={onOpen} sx={{ p: 0.5 }} aria-label="Account menu">
        <Avatar src={account.avatarUrl ?? undefined} sx={{ width: 34, height: 34 }}>
          {account.name.charAt(0)}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={onClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Disabled, but kept at full opacity — it's a header, not a dead option. */}
        <MenuItem disabled sx={{ opacity: '1 !important' }}>
          <Box>
            <Typography variant="subtitle2">{account.name}</Typography>
            {account.subtitle && (
              <Typography variant="caption" color="text.secondary">
                {account.subtitle}
              </Typography>
            )}
          </Box>
        </MenuItem>
        <Divider />

        {account.items.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              {Icon && <Icon fontSize="small" sx={{ mr: 1 }} />}
              {item.label}
            </>
          );
          return (
            <Fragment key={item.label}>
              {item.dividerBefore && <Divider />}
              {item.to ? (
                <MenuItem component={RouterLink} to={item.to} onClick={onClose}>
                  {content}
                </MenuItem>
              ) : (
                <MenuItem
                  onClick={() => {
                    onClose();
                    void item.onClick?.();
                  }}
                >
                  {content}
                </MenuItem>
              )}
            </Fragment>
          );
        })}
      </Menu>
    </>
  );
}
