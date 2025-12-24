import React, { memo } from 'react';

const GridCell = memo(({ isBirdHead, isBirdBody, isPillCell, index }) => {
  let className = 'grid-cell';
  
  if (isBirdHead) {
    className += ' bird-head';
  } else if (isBirdBody) {
    className += ' bird-body';
  } else if (isPillCell) {
    className += ' pill';
  }

  return <div className={className} />;
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.isBirdHead === nextProps.isBirdHead &&
    prevProps.isBirdBody === nextProps.isBirdBody &&
    prevProps.isPillCell === nextProps.isPillCell
  );
});

GridCell.displayName = 'GridCell';

export default GridCell;
