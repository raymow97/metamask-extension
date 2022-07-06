import { connect } from 'react-redux';
import PropTypes from 'prop-types';
///: BEGIN:ONLY_INCLUDE_IN(flask)
import { setDiff } from '@metamask/snap-controllers';
///: END:ONLY_INCLUDE_IN
import {
  getAccountsWithLabels,
  getLastConnectedInfo,
  ///: BEGIN:ONLY_INCLUDE_IN(flask)
  getPermissions,
  ///: END:ONLY_INCLUDE_IN
  getPermissionsRequests,
  getSelectedAddress,
  ///: BEGIN:ONLY_INCLUDE_IN(flask)
  getSnapUpdateRequests,
  ///: END:ONLY_INCLUDE_IN
  getTargetSubjectMetadata,
} from '../../selectors';
import { getNativeCurrency } from '../../ducks/metamask/metamask';

import { formatDate, getURLHostName } from '../../helpers/utils/util';
import {
  approvePermissionsRequest,
  rejectPermissionsRequest,
  showModal,
  getCurrentWindowTab,
  getRequestAccountTabIds,
} from '../../store/actions';
import {
  CONNECT_ROUTE,
  CONNECT_CONFIRM_PERMISSIONS_ROUTE,
  ///: BEGIN:ONLY_INCLUDE_IN(flask)
  CONNECT_SNAP_INSTALL_ROUTE,
  CONNECT_SNAP_UPDATE_ROUTE,
  ///: END:ONLY_INCLUDE_IN
} from '../../helpers/constants/routes';
import { SUBJECT_TYPES } from '../../../shared/constants/app';
import PermissionApproval from './permissions-connect.component';

const mapStateToProps = (state, ownProps) => {
  const {
    match: {
      params: { id: permissionsRequestId },
    },
    location: { pathname },
  } = ownProps;
  const permissionsRequests = getPermissionsRequests(state);
  const currentAddress = getSelectedAddress(state);

  let permissionsRequest = permissionsRequests.find(
    (req) => req.metadata.id === permissionsRequestId,
  );

  ///: BEGIN:ONLY_INCLUDE_IN(flask)
  let isUpdatingSnap;
  if (!permissionsRequest) {
    permissionsRequest = getSnapUpdateRequests().find(
      (req) => req.id === permissionsRequestId,
    );
    if (permissionsRequest) {
      isUpdatingSnap = true;
      const { id, origin: dappOrigin } = permissionsRequest;
      // reassigning the variable here to fit permissions actions
      // also adding a metadata property for the same
      // adding a dappOrigin property to display the requesting party for an update
      permissionsRequest = permissionsRequest.requestData;
      permissionsRequest.dappOrigin = dappOrigin;
      permissionsRequest.metadata = { id, origin: permissionsRequest.snapId };

      const oldPermissions = getPermissions(state, id);
      const currPermissions = {
        ...permissionsRequest.newPermissions,
        ...permissionsRequest.approvedPermissions,
      };
      permissionsRequest.revokedPermissions = setDiff(
        oldPermissions,
        currPermissions,
      );
    }
  }
  ///: END:ONLY_INCLUDE_IN

  const isRequestingAccounts = Boolean(
    permissionsRequest?.permissions.eth_accounts,
  );

  const { metadata = {} } = permissionsRequest || {};
  const { origin } = metadata;
  const nativeCurrency = getNativeCurrency(state);

  const targetSubjectMetadata = getTargetSubjectMetadata(state, origin) ?? {
    name: getURLHostName(origin) || origin,
    origin,
    iconUrl: null,
    extensionId: null,
    subjectType: SUBJECT_TYPES.UNKNOWN,
  };

  ///: BEGIN:ONLY_INCLUDE_IN(flask)
  const isSnap = targetSubjectMetadata.subjectType === SUBJECT_TYPES.SNAP;
  ///: END:ONLY_INCLUDE_IN

  const accountsWithLabels = getAccountsWithLabels(state);

  const lastConnectedInfo = getLastConnectedInfo(state) || {};
  const addressLastConnectedMap = lastConnectedInfo[origin]?.accounts || {};

  Object.keys(addressLastConnectedMap).forEach((key) => {
    addressLastConnectedMap[key] = formatDate(
      addressLastConnectedMap[key],
      'yyyy-MM-dd',
    );
  });

  const connectPath = `${CONNECT_ROUTE}/${permissionsRequestId}`;
  const confirmPermissionPath = `${CONNECT_ROUTE}/${permissionsRequestId}${CONNECT_CONFIRM_PERMISSIONS_ROUTE}`;
  ///: BEGIN:ONLY_INCLUDE_IN(flask)
  const snapInstallPath = `${CONNECT_ROUTE}/${permissionsRequestId}${CONNECT_SNAP_INSTALL_ROUTE}`;
  const snapUpdatePath = `${CONNECT_ROUTE}/${permissionsRequestId}${CONNECT_SNAP_UPDATE_ROUTE}`;
  ///: END:ONLY_INCLUDE_IN

  let totalPages = 1 + isRequestingAccounts;
  ///: BEGIN:ONLY_INCLUDE_IN(flask)
  totalPages += isSnap;
  ///: END:ONLY_INCLUDE_IN
  totalPages = totalPages.toString();

  let page = '';
  if (pathname === connectPath) {
    page = '1';
  } else if (pathname === confirmPermissionPath) {
    page = isRequestingAccounts ? '2' : '1';
    ///: BEGIN:ONLY_INCLUDE_IN(flask)
  } else if (pathname === snapInstallPath) {
    page = isRequestingAccounts ? '3' : '2';
    ///: END:ONLY_INCLUDE_IN
  } else {
    throw new Error('Incorrect path for permissions-connect component');
  }

  return {
    isRequestingAccounts,
    ///: BEGIN:ONLY_INCLUDE_IN(flask)
    isSnap,
    isUpdatingSnap,
    snapInstallPath,
    snapUpdatePath,
    ///: END:ONLY_INCLUDE_IN
    permissionsRequest,
    permissionsRequestId,
    accounts: accountsWithLabels,
    currentAddress,
    origin,
    newAccountNumber: accountsWithLabels.length + 1,
    nativeCurrency,
    addressLastConnectedMap,
    lastConnectedInfo,
    connectPath,
    confirmPermissionPath,
    totalPages,
    page,
    targetSubjectMetadata,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    approvePermissionsRequest: (request) =>
      dispatch(approvePermissionsRequest(request)),
    rejectPermissionsRequest: (requestId) =>
      dispatch(rejectPermissionsRequest(requestId)),
    showNewAccountModal: ({ onCreateNewAccount, newAccountNumber }) => {
      return dispatch(
        showModal({
          name: 'NEW_ACCOUNT',
          onCreateNewAccount,
          newAccountNumber,
        }),
      );
    },
    getRequestAccountTabIds: () => dispatch(getRequestAccountTabIds()),
    getCurrentWindowTab: () => dispatch(getCurrentWindowTab()),
  };
};

const PermissionApprovalContainer = connect(
  mapStateToProps,
  mapDispatchToProps,
)(PermissionApproval);

PermissionApprovalContainer.propTypes = {
  history: PropTypes.object.isRequired,
  match: PropTypes.shape({
    params: PropTypes.shape({
      id: PropTypes.string,
    }).isRequired,
  }).isRequired,
};

export default PermissionApprovalContainer;
