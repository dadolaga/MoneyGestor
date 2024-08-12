export class Order {
    private _listOfElement: OrderElement[];

    public constructor(order?: Order) {
        this._listOfElement = order ? order._listOfElement : [];
    }

    public clickOnElement(nameOfElement: string): Order {        
        let findElement = this.getElement(nameOfElement);
    
        if(findElement) {
            if(findElement.order == "asc") {
                findElement.order = "desc";
            } else {
                let index = this._listOfElement.indexOf(findElement);
                this._listOfElement.splice(index, 1);
            }
        } else {
            this._listOfElement.push({ name: nameOfElement, order: "asc" });
        }

        return new Order(this);
    }

    public haveElement(nameOfElement: string): boolean {
        return this.getElement(nameOfElement) != undefined;
    }

    public getElement(nameOfElement: string): OrderElement {
        return this._listOfElement.find(el => nameOfElement == el.name);
    }

    public toUrlString(): string {
        if(this._listOfElement.length == 0)
            return "";

        let urlString = "";

        this._listOfElement.forEach(el => {
            urlString += (el.order == "desc"? "!" : "") + el.name + "#";
        })

        return urlString.substring(0, urlString.length - 1);
    }
}

class OrderElement {
    public name: string;
    public order: "asc" | "desc";
}