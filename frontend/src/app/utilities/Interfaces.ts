import React from "react";

export interface IFormMultiType extends IPrintable, IKey { }

export interface IPrintable {
    print(): string | React.JSX.Element;
}

export interface IKey {
    getKey(): string | number,
}