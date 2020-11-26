import React, { Component } from 'react';
import styled from 'styled-components';
import close from '../../../assets/close.png';

import { Context } from '../../../shared/Context';
import { getIntegrationIcon } from '../../../shared/common';

type PropsType = {
};

type StateType = {
};

export default class IntegrationsModal extends Component<PropsType, StateType> {
  state = {
  }

  renderIntegrationsCatalog = () => {
    if (this.context.currentModalData) {
      let { integrations, setCurrentIntegration } = this.context.currentModalData;
      
      return integrations.map((integration: any, i: number) => {
        let icon = getIntegrationIcon(integration.value);
        return (
          <IntegrationOption 
            key={i}
            onClick={() => {
              setCurrentIntegration(integration);
              this.context.setCurrentModal(null, null);
            }}
          >
            <Icon src={icon && icon} />
            <Label>{integration.label}</Label>
          </IntegrationOption>
        );
      });
    }
  }
 
  render() {
    return (
      <StyledIntegrationsModal>
        <CloseButton onClick={() => {
          this.context.setCurrentModal(null, null);
        }}>
          <CloseButtonImg src={close} />
        </CloseButton>

        <ModalTitle>Add a New Integration</ModalTitle>
        <Subtitle>Select the service you would like to connect to.</Subtitle>
       
        <IntegrationsCatalog>
          {this.renderIntegrationsCatalog()}
        </IntegrationsCatalog>
      </StyledIntegrationsModal>
    );
  }
}

IntegrationsModal.contextType = Context;

const Label = styled.div`
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
`;

const Icon = styled.img`
  width: 30px;
  margin-right: 15px;
`;

const IntegrationOption = styled.div`
  height: 60px;
  user-select: none;
  width: 100%;
  border-bottom: 1px solid #ffffff44;
  display: flex;
  align-items: center;
  padding: 20px;
  cursor: pointer;
  :hover {
    background: #ffffff22;
  }
`;

const IntegrationsCatalog = styled.div`
  width: 100%;
  margin-top: 17px;
  border: 1px solid #ffffff44;
  border-radius: 5px;
  background: #ffffff11;
  height: calc(100% - 100px);
  overflow-y: auto;
`;

const Subtitle = styled.div`
  padding: 10px 0px;
  font-family: 'Work Sans', sans-serif;
  font-size: 13px;
  color: #aaaabb;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const ModalTitle = styled.div`
  margin: 0px 0px 13px;
  display: flex;
  flex: 1;
  font-family: 'Assistant';
  font-size: 18px;
  color: #ffffff;
  user-select: none;
  font-weight: 700;
  align-items: center;
  position: relative;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
  z-index: 1;
  text-align: center;
  border-radius: 50%;
  right: 15px;
  top: 12px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;

const StyledIntegrationsModal= styled.div`
  width: 100%;
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  padding: 25px 32px;
  overflow: hidden;
  border-radius: 6px;
  background: #202227;
`;