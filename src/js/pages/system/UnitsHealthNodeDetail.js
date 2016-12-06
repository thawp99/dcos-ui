import mixin from 'reactjs-mixin';
import {Link} from 'react-router';
/* eslint-disable no-unused-vars */
import React from 'react';
/* eslint-enable no-unused-vars */
import {StoreMixin} from 'mesosphere-shared-reactjs';

import Loader from '../../components/Loader';
import Page from '../../components/Page';
import RequestErrorMsg from '../../components/RequestErrorMsg';
import UnitHealthStore from '../../stores/UnitHealthStore';
import UnitsHealthNodeDetailPanel from
  './units-health-node-detail/UnitsHealthNodeDetailPanel';
import UnitSummaries from '../../constants/UnitSummaries';

const UnitHealthNodeDetailBreadcrumbs = ({node, unit}) => {
  const crumbs = [
    <Link to="components" key={-1}>Components</Link>
  ];

  if (unit != null) {
    let unitTitle = unit.getTitle();

    crumbs.push(
      <Link to={`components/${unit.get('id')}`} key={-1}>{unitTitle}</Link>
    );
  }

  if (node != null && unit != null) {
    let nodeIP = node.get('host_ip');
    let healthStatus = node.getHealth();

    crumbs.push(
      <Link to={`components/${unit.get('id')}/${nodeIP}`} key={1}>
        {`${nodeIP} `}
        <span className={healthStatus.classNames}>
          ({healthStatus.title})
        </span>
      </Link>
    );
  }

  return <Page.Header.Breadcrumbs iconID="components" breadcrumbs={crumbs} />;
};

class UnitsHealthNodeDetail extends mixin(StoreMixin) {
  constructor() {
    super(...arguments);

    this.state = {
      hasError: false,
      isLoadingUnit: true,
      isLoadingNode: true
    };

    this.store_listeners = [
      {
        name: 'unitHealth',
        events: ['unitSuccess', 'unitError', 'nodeSuccess', 'nodeError'],
        suppressUpdate: true
      }
    ];
  }

  componentDidMount() {
    super.componentDidMount(...arguments);
    let {unitID, unitNodeID} = this.props.params;

    UnitHealthStore.fetchUnit(unitID);
    UnitHealthStore.fetchUnitNode(unitID, unitNodeID);
  }

  onUnitHealthStoreUnitSuccess() {
    this.setState({isLoadingUnit: false});
  }

  onUnitHealthStoreUnitError() {
    this.setState({hasError: true});
  }

  onUnitHealthStoreNodeSuccess() {
    this.setState({isLoadingNode: false});
  }

  onUnitHealthStoreNodeError() {
    this.setState({hasError: true});
  }

  getErrorNotice() {
    return (
      <div className="pod">
        <RequestErrorMsg />
      </div>
    );
  }

  getLoadingScreen() {
    return <Loader />;
  }

  render() {
    let {hasError, isLoadingNode, isLoadingUnit} = this.state;
    let content = null;
    let node = null;
    let unit = null;

    if (hasError) {
      content = this.getErrorNotice();
    } else if (isLoadingNode || isLoadingUnit) {
      content = this.getLoadingScreen();
    } else {
      let {unitID, unitNodeID} = this.props.params;

      node = UnitHealthStore.getNode(unitNodeID);
      unit = UnitHealthStore.getUnit(unitID);

      let unitSummary = UnitSummaries[unit.get('id')] || {};
      let unitDocsURL = unitSummary.getDocumentationURI &&
          unitSummary.getDocumentationURI();

      content = (
        <UnitsHealthNodeDetailPanel
          routes={this.props.routes}
          params={this.props.params}
          docsURL={unitDocsURL}
          hostIP={node.get('host_ip')}
          output={node.getOutput()}
          summary={unitSummary.summary} />
      );
    }

    return (
      <Page>
        <Page.Header breadcrumbs={<UnitHealthNodeDetailBreadcrumbs node={node} unit={unit} />} />
        {content}
      </Page>
    );
  }
}
module.exports = UnitsHealthNodeDetail;
