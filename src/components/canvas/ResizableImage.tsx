import React, { useEffect, useRef } from 'react';
import { Image as KonvaImage, Transformer } from 'react-konva';
import useImage from 'use-image';

interface ResizableImageProps {
    shapeProps: any;
    isSelected: boolean;
    onSelect: () => void;
    onChange: (newAttrs: any) => void;
    onDblClick?: () => void;
}

export const ResizableImage = ({ shapeProps, isSelected, onSelect, onChange, onDblClick }: ResizableImageProps) => {
    // Filter out invalid URLs to prevent 404s
    const src = shapeProps.src || shapeProps.url;
    const isValidSrc = src && (src.startsWith('http') || src.startsWith('data:image/') || src.startsWith('blob:'));
    const [image] = useImage(isValidSrc ? src : '', 'anonymous');

    const shapeRef = useRef<any>();
    const trRef = useRef<any>();

    // 1. Destructure to remove non-Konva props (zIndex)
    const { zIndex, ...konvaProps } = shapeProps;

    useEffect(() => {
        if (isSelected) {
            // we need to attach transformer manually
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

    return (
        <React.Fragment>
            <KonvaImage
                onClick={shapeProps.isLocked ? undefined : onSelect}
                onTap={shapeProps.isLocked ? undefined : onSelect}
                onDblClick={shapeProps.isLocked ? undefined : onDblClick}
                ref={shapeRef}
                {...konvaProps}
                image={image}
                draggable={!shapeProps.isLocked}
                listening={!shapeProps.isLocked}
                onDragEnd={(e) => {
                    onChange({
                        ...shapeProps,
                        x: e.target.x(),
                        y: e.target.y(),
                    });
                }}
                onTransformEnd={() => {
                    // transformer is changing scale of the node
                    // and NOT its width or height
                    // but in the store we have only width and height
                    // to match the data better we will reset scale on transform end
                    const node = shapeRef.current;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();

                    // we will reset it back
                    node.scaleX(1);
                    node.scaleY(1);
                    onChange({
                        ...shapeProps,
                        x: node.x(),
                        y: node.y(),
                        // set minimal value
                        width: Math.max(5, node.width() * scaleX),
                        height: Math.max(5, node.height() * scaleY),
                        rotation: node.rotation(),
                    });
                }}
            />
            {isSelected && (
                <Transformer
                    ref={trRef}
                    boundBoxFunc={(oldBox, newBox) => {
                        // limit resize
                        if (newBox.width < 5 || newBox.height < 5) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                />
            )}
        </React.Fragment>
    );
};
