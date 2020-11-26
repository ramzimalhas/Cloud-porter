import React, { Component } from 'react';
import styled from 'styled-components';
import info from '../../assets/info.svg';
import edit from '../../assets/edit.svg';

import api from '../../shared/api';
import { getIntegrationIcon } from '../../shared/common';
import { Context } from '../../shared/Context';
import { ImageType } from '../../shared/types';

import Loading from '../Loading';
import TagList from './TagList';

type PropsType = {
  forceExpanded?: boolean,
  selectedImageUrl: string | null,
  setSelectedImageUrl: (x: string) => void
};

type StateType = {
  isExpanded: boolean,
  loading: boolean,
  error: boolean,
  images: ImageType[],
  clickedImage: ImageType | null,
};

const dummyImages = [
  {
    kind: 'docker-hub',
    source: 'index.docker.io/jusrhee/image1',
  },
  {
    kind: 'docker-hub',
    source: 'https://index.docker.io/jusrhee/image2',
  },
  {
    kind: 'docker-hub',
    source: 'https://index.docker.io/jusrhee/image3',
  },
  {
    kind: 'gcr',
    source: 'https://gcr.io/some-registry/image1',
  },
  {
    kind: 'gcr',
    source: 'https://gcr.io/some-registry/image2',
  },
  {
    kind: 'ecr',
    source: 'https://aws_account_id.dkr.ecr.region.amazonaws.com/smth/1',
  },
  {
    kind: 'ecr',
    source: 'https://aws_account_id.dkr.ecr.region.amazonaws.com/smth/2',
  },
];

export default class ImageSelector extends Component<PropsType, StateType> {
  state = {
    isExpanded: this.props.forceExpanded,
    loading: false,
    error: false,
    images: [] as ImageType[],
    clickedImage: null as ImageType | null,
  }

  componentDidMount() {
    this.setState({ images: dummyImages });
  }

  renderImageList = () => {
    let { images, loading, error } = this.state;
    if (loading) {
      return <LoadingWrapper><Loading /></LoadingWrapper>
    } else if (error || !images) {
      return <LoadingWrapper>Error loading repos</LoadingWrapper>
    }

    return images.map((image: ImageType, i: number) => {
      let icon = getIntegrationIcon(image.kind);
      return (
        <ImageItem
          key={i}
          isSelected={image.source === this.props.selectedImageUrl}
          lastItem={i === images.length - 1}
          onClick={() => { 
            this.props.setSelectedImageUrl(image.source);
            this.setState({ clickedImage: image });
          }}
        >
          <img src={icon && icon} />{image.source}
        </ImageItem>
      );
    });
  }

  renderBackButton = () => {
    let { setSelectedImageUrl } = this.props;
    if (this.state.clickedImage) {
      return (
        <BackButton
          width='175px'
          onClick={() => {
            setSelectedImageUrl('');
            this.setState({ clickedImage: null });
          }}
        >
          <i className="material-icons">keyboard_backspace</i>
          Select Image Repo
        </BackButton>
      );
    }
  }

  renderExpanded = () => {
    let { selectedImageUrl, setSelectedImageUrl } = this.props;
    if (!this.state.clickedImage) {
      return (
        <div>
          <ExpandedWrapper>
            {this.renderImageList()}
          </ExpandedWrapper>
          {this.renderBackButton()}
        </div>
      );
    } else {
      return (
        <div>
          <ExpandedWrapper>
            <TagList
              selectedImageUrl={selectedImageUrl}
              setSelectedImageUrl={setSelectedImageUrl}
            />
          </ExpandedWrapper>
          {this.renderBackButton()}
        </div>
      );
    }
  }

  renderSelected = () => {
    let { selectedImageUrl, setSelectedImageUrl } = this.props;
    let icon = info;
    if (this.state.clickedImage) {
      icon = getIntegrationIcon(this.state.clickedImage.kind);
    } else if (selectedImageUrl && selectedImageUrl !== '') {
      icon = edit;
    }
    return (
      <Label>
        <img src={icon} />
        <Input
          onClick={(e: any) => e.stopPropagation()}
          value={selectedImageUrl}
          onChange={(e: any) => { 
            setSelectedImageUrl(e.target.value); 
            this.setState({ clickedImage: null });
          }}
          placeholder='Enter or select your container image URL'
        />
      </Label>
    );
  }

  handleClick = () => {
    if (!this.props.forceExpanded) {
      this.setState({ isExpanded: !this.state.isExpanded });
    }
  }

  render() {
    return (
      <div>
        <StyledImageSelector
          onClick={this.handleClick}
          isExpanded={this.state.isExpanded}
          forceExpanded={this.props.forceExpanded}
        >
          {this.renderSelected()}
          {this.props.forceExpanded ? null : <i className="material-icons">{this.state.isExpanded ? 'close' : 'build'}</i>}
        </StyledImageSelector>

        {this.state.isExpanded ? this.renderExpanded() : null}
      </div>
    );
  }
}

ImageSelector.contextType = Context;

const BackButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  cursor: pointer;
  font-size: 13px;
  padding: 5px 13px;
  border: 1px solid #ffffff55;
  border-radius: 3px;
  width: ${(props: { width: string }) => props.width};
  color: white;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 16px;
    margin-right: 6px;
  }
`;

const Input = styled.input`
  outline: 0;
  background: none;
  border: 0;
  width: calc(100% - 60px);
  color: white;
`;

const ImageItem = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid ${(props: { lastItem: boolean, isSelected: boolean }) => props.lastItem ? '#00000000' : '#606166'};
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: pointer;
  background: ${(props: { isSelected: boolean, lastItem: boolean }) => props.isSelected ? '#ffffff22' : '#ffffff11'};
  :hover {
    background: #ffffff22;

    > i {
      background: #ffffff22;
    }
  }

  > img {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
    filter: grayscale(100%);
  }
`;

const LoadingWrapper = styled.div`
  padding: 30px 0px;
  background: #ffffff11;
  display: flex;
  align-items: center;
  font-size: 13px;
  justify-content: center;
  color: #ffffff44;
`;

const ExpandedWrapper = styled.div`
  margin-top: 10px;
  width: 100%;
  border-radius: 3px;
  border: 1px solid #ffffff44;
  max-height: 275px;
  overflow-y: auto;
`;

const Label = styled.div`
  display: flex;
  align-items: center;
  flex: 1;

  > img {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
  }
`;

const StyledImageSelector = styled.div`
  width: 100%;
  border: 1px solid #ffffff55;
  background: ${(props: { isExpanded: boolean, forceExpanded: boolean }) => props.isExpanded ? '#ffffff11' : ''};
  border-radius: 3px;
  user-select: none;
  height: 40px;
  font-size: 13px;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: ${(props: { isExpanded: boolean, forceExpanded: boolean }) => props.forceExpanded ? '' : 'pointer'};
  :hover {
    background: #ffffff11;

    > i {
      background: #ffffff22;
    }
  }

  > i {
    font-size: 16px;
    color: #ffffff66;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    padding: 4px;
  }
`;