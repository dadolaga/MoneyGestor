import React from "react";

export interface IPrintable {
    print(): string | React.JSX.Element;
}