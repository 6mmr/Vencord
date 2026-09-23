
/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Logger } from "@utils/Logger";
import { classes } from "@utils/misc";
import { findComponentByCodeLazy, findCssClassesLazy } from "@webpack";
import { Clickable, Tooltip, useEffect, useState, Popout, useRef, showToast, Toasts, SettingsRouter } from "@webpack/common";
import type { ComponentType, JSX, MouseEventHandler, ReactNode } from "react";
import { Settings } from "@api/Settings";
import { showNotification } from "@api/Notifications";

const NIGHTCORD_LOGO_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAABkRSURBVHhe7VsJVJRHtubNvDPvTWYmM4lGRFHZBERZm00Emm6abpYGARtj3HeNiltcomjQuARRFJVNQdbu/+/GJe5K3LdEjUncBYSIAWSTfUfxe6eq6RZ+SOK8M5i85TunjvTfVfe/9+tbt+6tKnV0/h+/Cf7AffB/Anl5eX61NbVn21pbsxtqa1UVZWWT7t+/b8Lt93vFHwryC2TVldXyqqqa/bmPcidwO/wSCgsKZa/aX4GLlpaWtuam5jvVVVXxRQUF0qSkpL9xx/7mKCgokNXX1X3HVb7op6Jobt+ecOX4lfeam5oqyJjS0lJcuXIZz58/54qjaG5sfFr2rHAMV8Zvguzs7FE1NTXnOitYVFSIZ8+eaT9fPn9jN3ccF4WFhXM0/efOnYM+fd7DyJGOmDFzKmLjduPqtcuorKT8ULS/fIHs7LuBXDlvDWfOnOlTW10d/+LFC61SFRUViI7eARsbKzg48PDjj/n0eVsTMH/87jSujM6orqo+Q/oS4qytrTF48GAYGAzBgAF60NX9AEOGDMLIkU5YuHABnj4toHJLCytaJ3qtX8iV1esoLii2a21pydMY3tTUhOTkZLi4uKBfv34wMDBAnz7vY9WqlVpyTqtyYK23aDFXFsGWLVv+1tBQT/39yJEj0NPTg6mpaUczo23o0KGUkHfe+U/s25dEZbY1tWNh4AHwTcLncmX2Gm7cuNGnubGpRGPY8ePH4efnRw0fNGgQVdrMzAxGRoYYPnwY8vMf034NtW2Y7r+3/s86ogFcmZcuXRK+etVO+61Zs4bKIjI0JJC/NZ/JO06ePEH7VpXXYa54P6TDdz94a8tmaXHpLPLy1tYWLF68GLq6uhg4cGAXRTWNGLJq9QoNVzi1PxeuBsu6xYPCp082kO9bWlohkUiokVxZpBkbG8PCwgLZ2Y+ovNs38iGzSUKwzb5SL6tP/sKV2yuoKC9PJS//4Yfvoa8/EIaGht0U1fxaRkZGMDMfitzHaoWbGl5iTtCepj4cL6iprrxMvr9z5zb1HBMT427ySCNxQCDgo7Gxnso7ytyAj2k8ZPZ7i6W82e90ltlrqH5eeZG8/Ny5M5QAMje5hnd23X79PkBY2CqtF5xUZcN10IpIjbysrKx+zc2NDeS7uLhY9OvXt5vra+Tq6fXH7NkztbJiNpyDn3kKgni77+jo6PxbV017CQ119d+Slx85cphG6J4I6PyZ/KKmpkPx4MF9qnRjQxs+lu2r66sj0SPyHjx4MFpj0MSJ46mRXBkauf376yI+Ppb2fdHWgoUfMpBZKxHEi1Zx9ewt/KG+rj6HKJCWlob+/ft3U7Sn9sEHfbvGAlU2nIcs30oElpaWxJFnJSXPYGtrTVcQ7njSCNGEzOvXr1IZz54+x9iRCRjHYzGaF7WSq2ivYE/Enr831DeUEwV27typjda/1tQrgjke5z2kyjfWtWJWYGKFjo6dXlNTLQ0Qx44eQf/+/br9+prPBgaGcHFxRlUVfT2uZGVDOiweY+3T4cNb5cXVtVdw6uApvaamJhqBNm3aRFcAjaLm5ubdDH/dzOncXrV6udYLlEk3sW6J4mb7q5cvyeeVK1dAV/fnCSVTY9as6drxSdvOws9sL4Ls4xqETjN0ubr2Cm7fvm3Y1tbaRhT49NNPtQkLV9meGlktSF6Ql5dNDagor0Zedin9myRSQqGQZn8aeVy5ZP6npSfT/iT7XD55P4ItGQQ77LrF1bPXcO9etsOrV+pqbfbs2RgwYEA3RbmfNc9I69dPF6s+1cQCIkct68aN63TJNDEx6XEFIOu/ubkZcnLUU+hJXilG28Ug0ILBKP01UVw9ew35ubn+HdpDJpN1S4B6Ur7zcyMjksiYIS8/VyOGIjIyEn379v1ZGfr6g+Dr64O2thba/5jyFvytd2DtrCM4mH5eUVJSuPLZs6LE+tqaQ02N9SfbWluPtzY3H6iuro6vr69f3FjbGFBSUmLIteefRuHTwslEAZIFent7U5flGtqT8a8/m9PCZvXqT7XGt7e3Y8yY4B69Sd1MaWz47LM12jE5D4qQn10GgIaPN8LLl20tLc3N3zbW128uKiqy4dr2RigvLV1KhNXW1sLd3f1nl6xfamRFsLAwR24uXU2Rm5uNYcOIm5t060uaqakJBg3SR1bWqQ5T1DVDF7S/QnVlAwryK/DgXjFu//AT7t4rRl5+OZ4/r0d7R52hwcuXL9Dc1HiirLh4FNfGX0RJcXEUEVBSUgIej6dOdXtQ+tcaWRE02WFKahL66X7QrY+mGRoawNHRHhXl6oCpxitUFFXj+lc5SN52EeHzD2P++ExMCVJirJSB1CcD3n4Z8AtSQDZZhVmfHMPGmMs4fjkP5TXqNJqAEFFT8/wzrp0/i8rKCloHPH78mBYlJDhxFSatp3mseU7+JV5gZTUCT58+wZw5s3tMqDR99fQGYMbMaVqlc28VInn9GXzin46ZbqmY5JqKj/hp+FCYgbFiBmN8lJD6KuHtp4KnL4tRvgrY+aRjmDgFZj7J8JqxH9HpN1BYVqeVWVZcnMC1tUfU1FRlkgF37tyhEbsnAoji6trdQEtE56bpR35ZL7EnrKystOl0t36mZtDV08X+QwrUljQiddVJLOenYIFTGhby5ZjvqcAsiQLTvBlM8lbgI18FZH4MAqQM/AJUkPirIBithEsQA4dABrbBDExHK6DnlYiRk+X45nahloRFUxNYHR39P3Nt7oKqqqrTpPPXX1/DkCFDKAlc4wkpzs7OmDZtGgYPHtLdKG1fMxpEiQxNEsXta2g0BDb2I3A04Qyigw9gmf0+rOKz+FSowmIRi1AvBrMpAQotASFSBqMDWPgFZFIChKOVGBXIwDGIgV0wA0uZHOYyBd4T7cWy7We1BKxfeBaOQ9bs5drcBTXV1bdJ59OnT0Jff0C3Qog08sv7+HgjPz8PLi4ju60Ub9ZMYWJqAgOjIZjkMhsRAgbrRjJYL1BitZDBck8Wi70YLBAzmOPNUA+Y6K3AOF85JSCQEqCCdwcBbh0E2AYrYDlGDjMZi/4++xB/4BY1/sWLNswfr4SHeVQr32FZf67dFKGhof9RX1f3lAxgGAUGDCBVW1fFyS9HNjMCA9UFXnp6co/5/a81EvkNjAdhHG86dnhkYoubEhuFDNZ7sAgTKrFcRAhQYIE3g9kaAnwIAQrIpAwC/Fn4Big7CFDBLZCFUzDxAEKAAsaBclhNkCO3SL3rnJddAj/H3fC22wshL9yRaztFRkbGu81NTTQUJyTEU8O6K25K1/OJEyd0MNuK0aMD6LPOfbjjusoYikFG+vC3DMQuDxY73FSI8GCxUaDEOg9lJwIYLJAwNAZM1xDgpyZgtD/xACW8A157gBOdAmoC9H2SMWndSbzqyETT4y5ilPE2+NjHQey4xpprO8WVK1fea2lpoZRt2RLxsxsXJKKHhoZSwQRZWV9BX19fm+ZyCevyzNQMBkMHwcncCZH8vYhxVyHKncUWvhIbBSzWCTKxRqjCCk8llohYLPBSYLaYeACLSdQD5JD5sQj0U0JKp4ASnh0EOAcy4NEYoIC+dyKSj96h+r18+RLzJ6TD1TQOYtvtpXz+vL9ybae4dOnmoOam5mYyKCxsNd3p4RpEGqkQ16wJ0xJAaofJkyd3qRw7G99ZBnF9I2MDLHZcjUT+AUS7yrHNnUEEn3gAoyVgpUiJxSIGC0gQFLOYJmEwQcJCJmLgL0iDt0cqPIUZcPfMgKu3HKP8GYwMZGAfzGBYkBy8CRnIL66k+uU8LIYXbxe8bNMgtItguHZr8ejuI56mEAoNXdCtdNUYQ55HRGzWEkBw48YNWg1qls2ejCeBz8BkEEQWIsTx5Yh1Y7HTTYFtbgotAeECFZ0ChIClIgahHUGQ5AEh7imYP+EQ1q04gchNZxEZcRFhYacxZfaX8AxkYC1Og5W/HAY+qZj62Smt+6fEX4KT8TZ4O+wD32aNjGu3Fk8eP/HQGDR16hTo6fX0i6rL1ri43Z3tpwgNXUg3UEhV191zTGFqZgTDoQZY4RCGfe4HsNtNgZ2uckS5KTqmAFkF1ASsELFYImYwX8RgklsKwuYcxuWsbNRUka3FzvXBKzS3tOFRThniUm9BNEmJgcJYsKfV23Pt7S8xZ3wq3MxjIOHtqHG1HP8e124t8nPzpRqxISGkEtTjGKFuZONCLs+g/V62kxxcrVBOTg6GDTOnWWCXMeTQw9QUBqaD4GThhF2uSUhwZSkBZAqoCWCwiRKgDoIrRSwWiRSY6pqExC3n0dTQqlHtF/G0uAYnLuaisZXOZOTcK4KX7XZ485Lgabf5INfmLigsKJxEBrW2tkIs9qIFivqX7+oFhJhjx47SFzx5XIyLx+keKsWmTZ/T/UHNONKfBEejocbQN9LDWJsQJPGViBulUBPgpuhEgOL1MuilxOxRqdgVloVXlGQ18rKfgUm+iqjPT2L756eRHn8Nl7Luo+p5jbaPBmTc6lAVXE2jIXVMBN92+SSuzV2gKYVbWlogEHjg3Xf/Std8ktISI0hSRBqZAufPqzOsx3cLsUAag5pydQFSWvYMPJ4t3nvvH9DV7U+XUjKVBuj3x+AhA7HUaTlSXTMRP4rBbjdGS0Akn8FGD3UeQILgJx4slgcoUFZUpbEGyTHn4W23HS7GW+Bqsh18s1h4mMdBaLETE8WpYPfexLOfqlBf24AnueXYuPJLuJhthcQuEV52W1v4DiE9J0Aa5NzPsdGwl5V1GpMmTaSeYGdnow5gBkPQt8/7sLGxpEUOwf1vCiDR34DMmCuaofjm+jWErV6FzZs3IiEhDkqlAqeyTuHapatIHZuOBF5aNwKIBxACwoUswjyVWOCSCsVWepZC8WXGdTgPWQ+RxU4E2KfAx2ZHi5fVpgvuI9Yk8YeHpzqbrLzsOnRtSaDbTkzyS4N05G64DYuG2G4PRjtlwNN2bRzX3h5R/bxS7dsdaG5pRFFRAe7du4PLly/h4MEDuHf/rvZ7dtdV+AyKxBT3Xe2lRZ3L2R7Q+ArpUgXi7FMQ66qZAgzNA4gHbPJgES5gESZQInRUCr49pz5zrK2px2SfvRCaRcOflwhv280nBfaLzLi6m5iYvGs5+GORs2kYKxqx44Wv3T742MdCZBd+gMfjvdmp0unTp9+vLK/M4ureE/IfPMNUl3iMH5GMAPNNRUcPHRVXlJXf6NrrFc0TCMqzy5DgnogE53TEuhEPkHclgM8g3IPFKncWK8VyFOap7wp8dy0XQvNIjLZLg7dN5OU3OSQVWM41Ew1fLxFaLrbjfvcm+Pf1C1MLMmO+w7nDd/DDtTzkPShGSWElXYYqSqpx/sj3mCGIQ+DQGEx3UEJmt+Fsx9g/fvZx6jcxq89jY+ghrJ6ShuyOkvTpraeIdUrAHud0xNEpIMcOmgcw6iBIYgCfxQpXOdaOZlFZUkvHnT74PdyNt0BqGwuxzQoXjq69A7N3Jkl8Tbc0yywSETI8HuN5cZjJT8Q8nxTM4Ccg2CwaY80TMcU2AxMdEhDguNhPM1ZPZ4q51HDjgxCzOMjM4/HwZpGagBsFnQggU0BNQJQbg0iP1wSsdJUjPJhFdbmagFMHvofAZCfE1pty3tr5IIG3zRyL0VaRa4Mso46NGbE9J3DYtrJA06iGIPPo9nEjYvGRZVz7BN7Ox362odO5Y3VMdP4jePhaSaD5+gU/PiiiQaPou0IkOCeppwCNAWQKKLDdnUEkn6VTYJ1AiU89WKz0SUNRPtkUBW5dzYFkeCw8LTe/8fngrVu3XMtLSw9WVVV9lZOTE8T9/p9HiM4fHR293xXZLh8gsVxj5msRbiOxXG5mYaHzJ25XLioqSzbSGJBTjj3u+xDvlIZYN3lHEJQjihKgxCY+KYbIfoASoS77cOtMRxCsasR073Q4DlyVzJXNRXhI+J9KS0sjyFLeGZWVFeTOwtvzns4oLCigFy4ayhuQ5JuGOMcUxGlXAUUHAcQD1ASECVksdE4FE/l6GbxwNBtuRiuOcWV3xt2bN40a6uuva8Y8LKjAtR/Ud5gIch4+ziTxjTuu15GXnT2KavDyFfZPP4Q42xTEuSmwi04Bkgoz2EoIoOUwSz1guQdLN0V/+lE9DQiunb3zLHxR+D+48rPS0//yvLx8RlNjo7bz7ZxSOE/MwGC/BHzzoFgrI2yh/Ah3fK/jwoULf21uVp84n//iEnZZ70WMdgp08gCaBzBYLSDFkAofu6biiwWH0VDfpDWgubH+UV1d5fanT598WlZWsr6xvia9taVFnZV14MyNfIycJMdgv1T09dmHqRtOaCvDezfKMMp06Vqujr2OuroammBln85FtO1exLkQAtRBkHjAFncWGzvyAEIA2RMkGyIzXFLxxaJjKPzx9f3Bn0NJRR227LmKEf77YCJNh1kIA8Mxcgz0S0DWzddTYe0CVZuOjvPbvZr7vLx8EXl5Q0UDEn0ZxDiSZEhB9wPoMuiuxEaPjiAoUGKZkKUbIovESkxzlWNeoAKK+K+R+/AZ6uub0NbShtamFlRW1uH7u0WITrgGv0lKWEjSMDxIjhF0Y1QBk5AM9PFJQuDKI2h7SQ+9kXOnCnyL1W+8ovxLcPfuXaO2tjaqwfltV7Hdeh9i3RlEu5IpQDJBpXoKkFpASAhgsMSTwUIxg7kSFlOFcshck/GRTzrmTT2IJfOOYe6coxg3YT8EUgV4ogw4+MnhEMzCRsbAcgwD0zFyGMsyMEiWjj6+idh/QX1UR7Bh+SG8q+Njz9WzV9HUWEfPHCqfVGO3ZwainTM6pgBLPUBNAIMwIYMVhADqAQzmiVnMFLOYImExzisTgSIWPiIGXmIGnhIlhFIlPAJVcAlSwiGIgfUY9caoqUwO4zEZMJAp8L5fKkQLD6CuWb083v+uAh7D153g6tireP68TKz5BS7F3MRWqyTscmOww43tiAEdQVBDgBfxALaDAAZTJSqM985EiG8mAqWZkPpn0m1xUYASHkFKjApi4RBMCJCrzwZC5DAOkcNAJsfAMQr8TbIHqrPqnaLqqkbIPPfCQndFz1vkvYWGhoYLRIGWumakTj6ESNtkRPHJfoCagHUaAjxZLPVisMhLTcAsMg28OxHgr4LUX30uIApQwSNIRQlwHMN2eICaAJMQBQxlcvQPTEdfaTy+uqm+/VtTXY8PJelwNo/I4OrYq8h7+HBEW1sbvX1dfL8U24VyRNhnIJKv6giChAAWKwkBIgaLOzxgFvUAJSZQAlQIkmbC318JH38lvEZnQhCoJsCBECBT0OMxM5kcQ2UZ0A9Kx/u+exDFkkJVvRx+c/kxBDax4FtHFzs7L/nl88J/NSoqKrQ3qR6d+xFfuKdhsxPZElN2JEKs2gM6EUCmwLQOAmQ+SgRJiQew9FyAeICWADIFKAEKmIfIoR+QBj2fBOxQ3tS8Ei2NrZg7Ph0jzXdBaLe70WnEqrdzAaszqqoq92tJuFCAL7wYhNmnUw8I82ToydBST4buDBMCZksYOgUmSDIx1luFYGkmAgKIB6jowYggSAlXMgWCGdjIFBguY9DfJxnW41KgPHNPa/yLtpdYv+wQnE22QWyfCr5NVIGFhcWv1jP/cuwJ3/NOfV299n+fFNwpxq7Jh7HMIQUr3VgsFynxiYgQwGK+WKUmQKLEeEKATyYlwD9ACV8yBQKUEASyHQSwMJWmY4h4Dz5cfgi3H7/epWqaMZnSw/B3mgrhLYJ8HHKAN927QKubm8N3377rV59bY36ljVRsL4JWYnf4jOpEvMckrHQVY7FIhXmizMxW6zsiAH78SEhwE8FqZ8KvlIVjQFuASxsJRkYIU7B6LmZSD96F63q234UZSU1CJ2WBp4RBAR2CfB2Soe7zfpfPip/G1ClqgYW5Ba/9lFyv/CnGpzYcxMbJhzGPH4GpjorMHmUHB/xFQgRMgjyVEBK8gBPBdwEqXARpUIQmIEZS79E5vEHqG1o7CwOVy9mY6x3PByHboWnXSIk9inwtN0Yw9XlN4PIbNyAL9MvP2p9faOFormuGfevFeDA3pvYHX4ea+cfxaKpBzFv8gHMn3kYnyw5hoiIc8g8+D0e5JbiRXvXG2XlpdWI3nga7iMi4Tx0ByQOqZA4JMLdau2b3xl6i+g/M2D7xayDD9Hc0PPVOHJ7tLGhBXW1TWhobEZ7+2sX7wzi7slxFxAs2AVHw0h4WibAx4FsjW8v5dos/vmzwd8B/mivu3jDDL+Y1ozd1/HwdhGaG16Xwr+E6qpafHMlF9vWH0eQRwwcDSLgMSwWEvtUiOxiILDdkmptPXkg94W/S/TTkVny+i9TSiy34OMgFTYvO4F9O8/imOo7nDvxABdOPcTZY/fxpeIm9u44gzULD+FDr1i4DduCkcZREA7fA1+7NHha74TAduvhUXYrnLnv+B8BV+NPeC5Ga/aMNPz8Gd84Cl5mcRAPS4DXsDiIzGPhaRoD4dAYCM3iIbFKhq9dCrxt4+FpveMnD5sv4p3/m2cCvzvweCF/F1iHiSVWG9d6W0cwXsMjv/IaEXXZyyrqa1/bmKti2x1nPG0jUgTWm5a4W653s7Lyejv/uep/E/4LA2ZEkUlEbFAAAAAASUVORK5CYII=";

const logger = new Logger("HeaderBarAPI");

const HeaderBarClasses = findCssClassesLazy("clickable", "selected", "badge", "badgeContainer");
const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '"aria-haspopup":') as ComponentType<ChannelToolbarButtonProps>;

export interface HeaderBarButtonProps {
    icon: ComponentType<any>;
    tooltip: ReactNode;
    onClick?: MouseEventHandler<HTMLDivElement>;
    onContextMenu?: MouseEventHandler<HTMLDivElement>;
    className?: string;
    iconSize?: number;
    position?: "top" | "bottom" | "left" | "right";
    selected?: boolean;
    "aria-label"?: string;
}

export interface ChannelToolbarButtonProps extends HeaderBarButtonProps {
    iconClassName?: string;
    position?: "top" | "bottom" | "left" | "right";
    selected?: boolean;
    disabled?: boolean;
    showBadge?: boolean;
    badgePosition?: "top" | "bottom";
}

export type HeaderBarButtonFactory = () => JSX.Element | null;

export interface HeaderBarButtonData {
    render: HeaderBarButtonFactory;
    icon: ComponentType<any>;
    priority?: number;
    location?: "headerbar" | "channeltoolbar";
}

interface ButtonEntry {
    render: HeaderBarButtonFactory;
    priority: number;
}

export function HeaderBarButton(props: HeaderBarButtonProps & { ref?: React.RefObject<any>; }) {
    const {
        icon: Icon,
        tooltip,
        onClick,
        onContextMenu,
        className,
        iconSize = 18,
        position = "bottom",
        selected,
        ref,
        "aria-label": ariaLabel,
    } = props;

    const label = ariaLabel ?? (typeof tooltip === "string" ? tooltip : undefined);

    if (!Tooltip || !Clickable || !Icon) {
        return null;
    }

    return (
        <Tooltip text={tooltip ?? ""} position={position} shouldShow={tooltip != null}>
            {({ onMouseEnter, onMouseLeave }) => (
                <Clickable
                    {...{ innerRef: ref } as any}
                    className={classes(HeaderBarClasses.clickable, "nightcord-header-btn", className)}
                    style={{ justifyContent: "center", cursor: "pointer" }}
                    onClick={onClick}
                    onContextMenu={onContextMenu}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    role="button"
                    tabIndex={0}
                    aria-label={label}
                    aria-expanded={selected}
                >
                    <Icon width={iconSize} height={iconSize} color="currentColor" />
                </Clickable>
            )}
        </Tooltip>
    );
}

export function ChannelToolbarButton(props: ChannelToolbarButtonProps) {
    return <HeaderBarIcon {...props} />;
}

const headerBarButtons = new Map<string, ButtonEntry>();
const channelToolbarButtons = new Map<string, ButtonEntry>();

const headerBarListeners = new Set<() => void>();
const channelToolbarListeners = new Set<() => void>();

export function addHeaderBarButton(id: string, render: HeaderBarButtonFactory, priority = 0) {
    headerBarButtons.set(id, { render, priority });
    headerBarListeners.forEach(listener => listener());
}

export function removeHeaderBarButton(id: string) {
    headerBarButtons.delete(id);
    headerBarListeners.forEach(listener => listener());
}

export function addChannelToolbarButton(id: string, render: HeaderBarButtonFactory, priority = 0) {
    channelToolbarButtons.set(id, { render, priority });
    channelToolbarListeners.forEach(listener => listener());
}

export function removeChannelToolbarButton(id: string) {
    channelToolbarButtons.delete(id);
    channelToolbarListeners.forEach(listener => listener());
}

// ══════════════════════════════════════════════════════════════════
// STEALTH MODE
// ══════════════════════════════════════════════════════════════════

import { isStealthModeEnabled, setStealthActive } from "./stealthState";
export { isStealthModeEnabled };

let _stealthActive = isStealthModeEnabled();

function persistStealth(v: boolean) {
    try { v ? localStorage.setItem("Nightcord_stealthMode", "1") : localStorage.removeItem("Nightcord_stealthMode"); } catch { }
}

const NON_REACT_SELECTORS = [
    "#nightcord-titlebar-btn",
    "#nightcord-titlebar-link-style",
    ".nai-nav-item",
];

function hideSettingsSidebarElements(hide: boolean) {
    try {
        // Direct modern Discord settings sidebar targeting
        document.querySelectorAll('li:has([data-settings-sidebar-item*="equicord"]), li:has([data-settings-sidebar-item*="nightcord"]), li:has([data-settings-sidebar-item*="illegalcord"]), li:has([data-list-item-id*="settings-sidebar___equicord"]), li:has([data-list-item-id*="settings-sidebar___nightcord"]), li:has([data-list-item-id*="settings-sidebar___illegalcord"])').forEach(el => {
            (el as HTMLElement).style.display = hide ? "none" : "";
        });

        document.querySelectorAll('[data-settings-sidebar-item*="equicord"], [data-settings-sidebar-item*="nightcord"], [data-settings-sidebar-item*="illegalcord"], [data-list-item-id*="settings-sidebar___equicord"], [data-list-item-id*="settings-sidebar___nightcord"], [data-list-item-id*="settings-sidebar___illegalcord"]').forEach(el => {
            (el as HTMLElement).style.display = hide ? "none" : "";
        });

        // Sidebar headers and sections fallback
        const sidebars = document.querySelectorAll("[class*='sidebar_'], [class*='side_'], [role='tablist'], [class*='sectionList_']");
        sidebars.forEach(sidebar => {
            const items = Array.from(sidebar.querySelectorAll("[class*='item_'], [class*='header_'], [class*='separator_'], [class*='sectionLabel_'], [role='tab']"));
            let isNightcordSection = false;
            for (const el of items) {
                const text = el.textContent?.trim()?.toLowerCase() || "";
                const isHeader = el.getAttribute("class")?.includes("header") || el.getAttribute("class")?.includes("sectionLabel") || el.getAttribute("role") === "heading";
                const isSeparator = el.getAttribute("class")?.includes("separator");

                if (text.includes("nightcord settings") || text.includes("paramètres de nightcord") || text.includes("equicord settings") || text.includes("parametres de nightcord")) {
                    isNightcordSection = true;
                    (el as HTMLElement).style.display = hide ? "none" : "";
                    const parentLi = el.closest("li, [class*='section_']");
                    if (parentLi) (parentLi as HTMLElement).style.display = hide ? "none" : "";
                    continue;
                }

                if (isNightcordSection) {
                    if (isHeader) {
                        isNightcordSection = false;
                        continue;
                    }
                    if (isSeparator) {
                        (el as HTMLElement).style.display = hide ? "none" : "";
                        isNightcordSection = false;
                        continue;
                    }
                    (el as HTMLElement).style.display = hide ? "none" : "";
                }
            }
        });
    } catch { }
}

function hideNonReactElements(hide: boolean) {
    for (const sel of NON_REACT_SELECTORS) {
        try {
            document.querySelectorAll(sel).forEach(el => {
                (el as HTMLElement).style.display = hide ? "none" : "";
            });
        } catch { }
    }
    hideSettingsSidebarElements(hide);
}

export function syncStealthBodyClass() {
    try { if (_stealthActive) document.body?.classList.add("nightcord-stealth"); else document.body?.classList.remove("nightcord-stealth"); } catch { }
    hideNonReactElements(_stealthActive);
}

export function toggleStealthMode() {
    _stealthActive = !_stealthActive;
    setStealthActive(_stealthActive);
    persistStealth(_stealthActive);
    hideNonReactElements(_stealthActive);
    _notifyStealthChange();
    try {
        if (_stealthActive) {
            document.body?.classList.add("nightcord-stealth");
            showNotification({
                id: "nightcord-stealth-mode",
                title: "Stealth Mode Activated",
                body: "All Nightcord visual elements and settings are hidden. Press Ctrl+Shift+H to restore Nightcord.",
                icon: "nightcord",
                type: "info",
                duration: 6000
            });
        } else {
            document.body?.classList.remove("nightcord-stealth");
            showNotification({
                id: "nightcord-stealth-mode",
                title: "Stealth Mode Deactivated",
                body: "Nightcord visual elements and settings have been restored.",
                icon: "nightcord",
                type: "success",
                duration: 4000
            });
        }
    } catch { }
    return _stealthActive;
}

if (_stealthActive) {
    try { hideNonReactElements(true); } catch { }
    try { document.body?.classList.add("nightcord-stealth"); } catch { }
}

try {
    document.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey && e.code === "KeyH") {
            e.preventDefault();
            e.stopPropagation();
            toggleStealthMode();
        }
        if (e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey && e.code === "KeyG") {
            e.preventDefault();
            e.stopPropagation();
            const newVal = !Settings.streamProof;
            Settings.streamProof = newVal;
            if (typeof window !== "undefined" && (window as any).VencordNative?.setContentProtection) {
                (window as any).VencordNative.setContentProtection(newVal);
            }
            try {
                if (newVal) {
                    showNotification({
                        id: "nightcord-streamproof-mode",
                        title: "StreamProof Activated",
                        body: "Window content protection is enabled. Press Ctrl+Shift+G to disable.",
                        icon: "nightcord",
                        type: "info",
                        duration: 6000
                    });
                } else {
                    showNotification({
                        id: "nightcord-streamproof-mode",
                        title: "StreamProof Deactivated",
                        body: "Window content protection is now disabled.",
                        icon: "nightcord",
                        type: "success",
                        duration: 4000
                    });
                }
            } catch {}
        }
    }, true);
} catch { }

try {
    let stealthObserver: MutationObserver | null = null;
    let stealthRaf: number | null = null;
    const startObserver = () => {
        if (stealthObserver) return;
        stealthObserver = new MutationObserver(() => {
            if (!_stealthActive) return;
            if (stealthRaf !== null) return;
            stealthRaf = requestAnimationFrame(() => {
                stealthRaf = null;
                if (_stealthActive) hideNonReactElements(true);
            });
        });
        const target = document.body || document.documentElement;
        if (target) {
            stealthObserver.observe(target, { childList: true, subtree: true });
        }
    };
    const stopObserver = () => {
        if (stealthRaf !== null) {
            cancelAnimationFrame(stealthRaf);
            stealthRaf = null;
        }
        if (stealthObserver) { stealthObserver.disconnect(); stealthObserver = null; }
    };
    if (_stealthActive) {
        if (document.body) startObserver();
        else document.addEventListener("DOMContentLoaded", startObserver);
    }
    window.addEventListener("nightcord-stealth-change", () => {
        if (_stealthActive) startObserver();
        else stopObserver();
    });
} catch { }

const stealthListeners = new Set<() => void>();
export function _notifyStealthChange() {
    stealthListeners.forEach(fn => fn());
    window.dispatchEvent(new Event("nightcord-stealth-change"));
}
export function addStealthListener(fn: () => void) { stealthListeners.add(fn); }
export function removeStealthListener(fn: () => void) { stealthListeners.delete(fn); }


// ══════════════════════════════════════════════════════════════════
// COMPACT MODE
// ══════════════════════════════════════════════════════════════════

let _compactActive = false;
try { _compactActive = localStorage.getItem("Nightcord_compactMode") === "1"; } catch { }

export function isCompactModeEnabled(): boolean {
    return _compactActive;
}

function persistCompact(v: boolean) {
    try { v ? localStorage.setItem("Nightcord_compactMode", "1") : localStorage.removeItem("Nightcord_compactMode"); } catch { }
}

export function syncCompactBodyClass() {
    try {
        const stored = localStorage.getItem("Nightcord_compactMode");
        if (stored === "1" && !_compactActive) {
            _compactActive = true;
        } else if (stored !== "1" && _compactActive) {
            _compactActive = false;
        }
    } catch { }

    try {
        if (_compactActive) {
            document.body?.classList.add("nightcord-compact");
        } else {
            document.body?.classList.remove("nightcord-compact");
        }
    } catch { }

    _notifyCompactChange();
}

export function toggleCompactMode() {
    _compactActive = !_compactActive;
    persistCompact(_compactActive);
    _notifyCompactChange();
    try { if (_compactActive) document.body?.classList.add("nightcord-compact"); else document.body?.classList.remove("nightcord-compact"); } catch { }
    return _compactActive;
}

if (_compactActive) {
    try { document.body?.classList.add("nightcord-compact"); } catch { }
}

export const compactListeners = new Set<() => void>();
export function _notifyCompactChange() {
    compactListeners.forEach(fn => fn());
    window.dispatchEvent(new Event("nightcord-compact-change"));
}
export function addCompactListener(fn: () => void) { compactListeners.add(fn); }
export function removeCompactListener(fn: () => void) { compactListeners.delete(fn); }

// ══════════════════════════════════════════════════════════════════
// ICONS
// ══════════════════════════════════════════════════════════════════

const GridVerticalIcon = (props: any) => (
    <svg width={props.width || 24} height={props.height || 24} viewBox="0 0 24 24" fill={props.color || "currentColor"} {...props}>
        <path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z" />
    </svg>
);

const GearIcon = (props: any) => (
    <svg width={props.width || 24} height={props.height || 24} viewBox="0 0 24 24" fill={props.color || "currentColor"} {...props}>
        <path fillRule="evenodd" clipRule="evenodd" d="M10.56 1.1c-.46.05-.7.53-.64.98.18 1.16-.19 2.2-.98 2.53-.8.33-1.79-.15-2.49-1.1-.27-.36-.78-.52-1.14-.24-.77.59-1.45 1.27-2.04 2.04-.28.36-.12.87.24 1.14.96.7 1.43 1.7 1.1 2.49-.33.8-1.37 1.16-2.53.98-.45-.07-.93.18-.99.64a11.1 11.1 0 0 0 0 2.88c.06.46.54.7.99.64 1.16-.18 2.2.19 2.53.98.33.8-.14 1.79-1.1 2.49-.36.27-.52.78-.24 1.14.59.77 1.27 1.45 2.04 2.04.36.28.87.12 1.14-.24.7-.95 1.7-1.43 2.49-1.1.8.33 1.16 1.37.98 2.53-.07.45.18.93.64.99a11.1 11.1 0 0 0 2.88 0c.46-.06.7-.54.64-.99-.18-1.16.19-2.2.98-2.53.8-.33 1.79.14 2.49 1.1.27.36.78.52 1.14.24.77-.59 1.45-1.27 2.04-2.04.28-.36.12-.87-.24-1.14-.96-.7-1.43-1.7-1.1-2.49.33-.8 1.37-1.16 2.53-.98.45.07.93-.18.99-.64a11.1 11.1 0 0 0 0-2.88c-.06-.46-.54-.7-.99-.64-1.16.18-2.2-.19-2.53-.98-.33-.8.14-1.79 1.1-2.49.36-.27.52-.78.24-1.14a11.07 11.07 0 0 0-2.04-2.04c-.36-.28-.87-.12-1.14.24-.7.96-1.7 1.43-2.49 1.1-.8-.33-1.16-1.37-.98-2.53.07-.45-.18-.93-.64-.99a11.1 11.1 0 0 0-2.88 0ZM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
    </svg>
);

// ══════════════════════════════════════════════════════════════════
// COMPACT POPOUTS
// ══════════════════════════════════════════════════════════════════

function CompactHeaderPopout({ type, closePopout }: { type: "header" | "channel", closePopout: () => void; }) {
    const map = type === "header" ? headerBarButtons : channelToolbarButtons;
    return (
        <div className="compact-popout-container">
            <div className="compact-popout-grid">
                {Array.from(map)
                    .sort(([, a], [, b]) => a.priority - b.priority)
                    .map(([id, { render: Button }]) => (
                        <div key={id} style={{ display: "contents" }} onClick={closePopout}>
                            <ErrorBoundary noop>
                                <Button />
                            </ErrorBoundary>
                        </div>
                    ))}
            </div>
            <div className="compact-popout-divider" />
            <div className="compact-popout-disable" onClick={() => { toggleCompactMode(); closePopout(); }}>
                Disable Compact Mode
            </div>
        </div>
    );
}

function CompactSettingsPopout({ closePopout }: { closePopout: () => void; }) {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const listener = () => forceUpdate(n => n + 1);
        compactListeners.add(listener);
        stealthListeners.add(listener);
        window.addEventListener("nightcord-compact-change", listener);
        window.addEventListener("nightcord-stealth-change", listener);
        return () => {
            compactListeners.delete(listener);
            stealthListeners.delete(listener);
            window.removeEventListener("nightcord-compact-change", listener);
            window.removeEventListener("nightcord-stealth-change", listener);
        };
    }, []);

    const compact = isCompactModeEnabled();
    const stealth = isStealthModeEnabled();

    return (
        <div className="nc-settings-popout">
            <div className="nc-settings-popout-title">Quick Settings</div>

            <div className="nc-settings-popout-section-label">Appearance</div>

            <div className="nc-settings-popout-row" onClick={() => toggleCompactMode()}>
                <div className="nc-settings-popout-row-info">
                    <div className="nc-settings-popout-row-name">Compact Mode</div>
                    <div className="nc-settings-popout-row-desc">Hide plugin buttons behind a single icon</div>
                </div>
                <div className={`nc-settings-popout-toggle ${compact ? "nc-on" : ""}`} onClick={e => { e.stopPropagation(); toggleCompactMode(); }}>
                    <div className="nc-settings-popout-toggle-knob" />
                </div>
            </div>

            <div className="nc-settings-popout-row" onClick={() => toggleStealthMode()}>
                <div className="nc-settings-popout-row-info">
                    <div className="nc-settings-popout-row-name">Stealth Mode</div>
                    <div className="nc-settings-popout-row-desc">Hide all Nightcord UI elements</div>
                </div>
                <div className={`nc-settings-popout-toggle ${stealth ? "nc-on" : ""}`} onClick={e => { e.stopPropagation(); toggleStealthMode(); }}>
                    <div className="nc-settings-popout-toggle-knob" />
                </div>
            </div>

            <div className="nc-settings-popout-divider" />

            <div className="nc-settings-popout-section-label">Plugin Buttons</div>
            <div className="nc-settings-popout-grid">
                {Array.from(headerBarButtons)
                    .sort(([, a], [, b]) => a.priority - b.priority)
                    .map(([id, { render: Button }]) => (
                        <div key={id} style={{ display: "contents" }}>
                            <ErrorBoundary noop>
                                <Button />
                            </ErrorBoundary>
                        </div>
                    ))}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
// TOGGLE COMPONENTS
// ══════════════════════════════════════════════════════════════════

function CompactHeaderBarToggle() {
    const [, forceUpdate] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const popoutRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const listener = () => forceUpdate(n => n + 1);
        compactListeners.add(listener);
        window.addEventListener("nightcord-compact-change", listener);
        return () => {
            compactListeners.delete(listener);
            window.removeEventListener("nightcord-compact-change", listener);
        };
    }, []);

    return (
        <div style={{ display: "flex", alignItems: "center" }}>
            <Popout
                targetElementRef={popoutRef}
                renderPopout={() => <CompactHeaderPopout type="header" closePopout={() => setIsOpen(false)} />}
                shouldShow={isOpen}
                onRequestClose={() => setIsOpen(false)}
                position="bottom"
                align="right"
                spacing={8}
            >
                {() => (
                    <div ref={popoutRef as any} style={{ display: "flex" }}>
                        <HeaderBarButton
                            icon={GridVerticalIcon}
                            tooltip="Compact Mode"
                            onClick={() => setIsOpen(v => !v)}
                            selected={isOpen}
                        />
                    </div>
                )}
            </Popout>
            <HeaderBarButton
                icon={GearIcon}
                tooltip="Nightcord Settings"
                onClick={() => {
                    SettingsRouter.openUserSettings("vencord_plugins_panel");
                }}
            />
        </div>
    );
}

function CompactChannelToolbarToggle() {
    const [, forceUpdate] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const popoutRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const listener = () => forceUpdate(n => n + 1);
        compactListeners.add(listener);
        window.addEventListener("nightcord-compact-change", listener);
        return () => {
            compactListeners.delete(listener);
            window.removeEventListener("nightcord-compact-change", listener);
        };
    }, []);

    return (
        <Popout
            targetElementRef={popoutRef}
            renderPopout={() => <CompactHeaderPopout type="channel" closePopout={() => setIsOpen(false)} />}
            shouldShow={isOpen}
            onRequestClose={() => setIsOpen(false)}
            position="bottom"
            align="right"
            spacing={8}
        >
            {() => (
                <div ref={popoutRef as any} style={{ display: "flex" }}>
                    <ChannelToolbarButton
                        icon={GridVerticalIcon}
                        tooltip="Compact Mode"
                        onClick={() => setIsOpen(v => !v)}
                        selected={isOpen}
                    />
                </div>
            )}
        </Popout>
    );
}

// ══════════════════════════════════════════════════════════════════
// MAIN RENDER COMPONENTS
// ══════════════════════════════════════════════════════════════════

function HeaderBarButtons() {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const listener = () => forceUpdate(n => n + 1);
        headerBarListeners.add(listener);
        stealthListeners.add(listener);
        compactListeners.add(listener);
        window.addEventListener("nightcord-stealth-change", listener);
        window.addEventListener("nightcord-compact-change", listener);
        return () => {
            headerBarListeners.delete(listener);
            stealthListeners.delete(listener);
            compactListeners.delete(listener);
            window.removeEventListener("nightcord-stealth-change", listener);
            window.removeEventListener("nightcord-compact-change", listener);
        };
    }, []);

    if (isStealthModeEnabled()) return null;

    if (isCompactModeEnabled()) {
        return (
            <div className="vc-header-bar-btns" style={{ display: "contents" }}>
                <CompactHeaderBarToggle />
            </div>
        );
    }

    return (
        <div className="vc-header-bar-btns" style={{ display: "contents" }}>
            <style>{`
                .nightcord-header-btn svg,
                .vc-header-bar-btns svg {
                    transform-origin: 50% 50%;
                    will-change: transform;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
                .nightcord-header-btn:hover svg:not(.nc-multi-instance-icon):not(.nc-soundcord-icon):not(.nc-sway-icon):not(.nc-cleaner-icon):not(.nc-no-anim),
                .vc-header-bar-btns [class*="clickable"]:hover svg:not(.nc-multi-instance-icon):not(.nc-soundcord-icon):not(.nc-sway-icon):not(.nc-cleaner-icon):not(.nc-no-anim),
                .vc-header-bar-btns [class*="iconWrapper"]:hover svg:not(.nc-multi-instance-icon):not(.nc-soundcord-icon):not(.nc-sway-icon):not(.nc-cleaner-icon):not(.nc-no-anim) {
                    animation: nc-header-btn-spring 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) 1;
                }
                @keyframes nc-header-btn-spring {
                    0% {
                        transform: translate3d(0, 0, 0) scale(1);
                    }
                    35% {
                        transform: translate3d(0, 0, 0) scale(1.18);
                    }
                    70% {
                        transform: translate3d(0, 0, 0) scale(0.96);
                    }
                    100% {
                        transform: translate3d(0, 0, 0) scale(1);
                    }
                }

                /* ── Sway Animations (SoundCord, CustomProfile, VoiceSearch, MessageCleaner) ── */
                .nc-sway-icon,
                .nc-soundcord-icon,
                .nc-cleaner-icon {
                    transform-origin: 50% 90%;
                    will-change: transform;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }

                :hover > .nc-sway-icon,
                [class*="iconWrapper"]:hover .nc-sway-icon,
                [class*="clickable"]:hover .nc-sway-icon,
                .nightcord-header-btn:hover .nc-sway-icon,
                button:hover .nc-sway-icon,
                .nc-sway-icon:hover,
                :hover > .nc-soundcord-icon,
                [class*="iconWrapper"]:hover .nc-soundcord-icon,
                [class*="clickable"]:hover .nc-soundcord-icon,
                .nightcord-header-btn:hover .nc-soundcord-icon,
                button:hover .nc-soundcord-icon,
                .nc-soundcord-icon:hover,
                :hover > .nc-cleaner-icon,
                [class*="iconWrapper"]:hover .nc-cleaner-icon,
                [class*="clickable"]:hover .nc-cleaner-icon,
                .nightcord-header-btn:hover .nc-cleaner-icon,
                button:hover .nc-cleaner-icon,
                .nc-cleaner-icon:hover {
                    animation: nc-soundcord-sway 0.52s cubic-bezier(0.25, 1, 0.5, 1) 1;
                }

                @keyframes nc-soundcord-sway {
                    0% {
                        transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
                    }
                    22% {
                        transform: translate3d(0, 0, 0) rotate(-16deg) scale(1.12);
                    }
                    48% {
                        transform: translate3d(0, 0, 0) rotate(13deg) scale(1.1);
                    }
                    72% {
                        transform: translate3d(0, 0, 0) rotate(-5deg) scale(1.03);
                    }
                    88% {
                        transform: translate3d(0, 0, 0) rotate(2deg) scale(1.01);
                    }
                    100% {
                        transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
                    }
                }

                /* ── MessageCleaner Jumping Trash Lid Animation ── */
                .nc-trash-lid {
                    transform-origin: 50% 25%;
                    will-change: transform;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }

                :hover > .nc-cleaner-icon .nc-trash-lid,
                [class*="iconWrapper"]:hover .nc-cleaner-icon .nc-trash-lid,
                [class*="clickable"]:hover .nc-cleaner-icon .nc-trash-lid,
                .nightcord-header-btn:hover .nc-cleaner-icon .nc-trash-lid,
                button:hover .nc-cleaner-icon .nc-trash-lid,
                .nc-cleaner-icon:hover .nc-trash-lid {
                    animation: nc-trash-lid-jump 0.52s cubic-bezier(0.34, 1.56, 0.64, 1) 1;
                }

                @keyframes nc-trash-lid-jump {
                    0% {
                        transform: translate3d(0, 0, 0) rotate(0deg);
                    }
                    25% {
                        transform: translate3d(1px, -4.5px, 0) rotate(-14deg);
                    }
                    55% {
                        transform: translate3d(-0.5px, -3px, 0) rotate(8deg);
                    }
                    78% {
                        transform: translate3d(0, -1px, 0) rotate(-2deg);
                    }
                    100% {
                        transform: translate3d(0, 0, 0) rotate(0deg);
                    }
                }

            `}</style>
            {Array.from(headerBarButtons)
                .sort(([, a], [, b]) => a.priority - b.priority)
                .map(([id, entry]) => {
                    const Button = entry?.render;
                    if (!Button) return null;
                    return (
                        <ErrorBoundary noop key={id}>
                            <Button />
                        </ErrorBoundary>
                    );
                })}
        </div>
    );
}

function ChannelToolbarButtons() {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const listener = () => forceUpdate(n => n + 1);
        channelToolbarListeners.add(listener);
        stealthListeners.add(listener);
        compactListeners.add(listener);
        window.addEventListener("nightcord-stealth-change", listener);
        window.addEventListener("nightcord-compact-change", listener);
        return () => {
            channelToolbarListeners.delete(listener);
            stealthListeners.delete(listener);
            compactListeners.delete(listener);
            window.removeEventListener("nightcord-stealth-change", listener);
            window.removeEventListener("nightcord-compact-change", listener);
        };
    }, []);

    if (isStealthModeEnabled()) return null;

    if (isCompactModeEnabled()) {
        return (
            <div className="vc-channel-toolbar-btns" style={{ display: "contents" }}>
                <CompactChannelToolbarToggle />
            </div>
        );
    }

    return (
        <div className="vc-channel-toolbar-btns" style={{ display: "contents" }}>
            {Array.from(channelToolbarButtons)
                .sort(([, a], [, b]) => a.priority - b.priority)
                .map(([id, entry]) => {
                    const Button = entry?.render;
                    if (!Button) return null;
                    return (
                        <ErrorBoundary noop key={id}>
                            <Button />
                        </ErrorBoundary>
                    );
                })}
        </div>
    );
}

const HEADER_STYLE_ID = "nightcord-headerbar-style";
const HEADER_STYLE_CSS = `
    div[role="button"][aria-label="Boîte de réception"],
    div[role="button"][aria-label="Inbox"],
    div[role="button"][aria-label="Bandeja de entrada"],
    div[role="button"][aria-label="Posteingang"],
    div[role="button"][aria-label="Входящие"],
    div[role="button"][aria-label*="Inbox" i],
    div[role="button"][aria-label*="réception" i],
    .nightcord-header-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        align-self: center !important;
        height: 24px !important;
        min-height: 24px !important;
        max-height: 24px !important;
        width: 24px !important;
        min-width: 24px !important;
        max-width: 24px !important;
        margin: 0 2px !important;
        margin-left: 2px !important;
        margin-right: 2px !important;
        margin-inline: 2px !important;
        padding: 0 !important;
        border-radius: 4px !important;
        box-sizing: border-box !important;
        vertical-align: middle !important;
        line-height: normal !important;
        flex: 0 0 24px !important;
        position: relative !important;
        color: var(--interactive-normal, oklab(0.745437 0.00131872 -0.00849736)) !important;
        transition: background-color 0.15s ease-out, color 0.15s ease-out !important;
    }

    div[role="button"][aria-label="Boîte de réception"]:hover,
    div[role="button"][aria-label="Inbox"]:hover,
    div[role="button"][aria-label="Bandeja de entrada"]:hover,
    div[role="button"][aria-label="Posteingang"]:hover,
    div[role="button"][aria-label="Входящие"]:hover,
    div[role="button"][aria-label*="Inbox" i]:hover,
    div[role="button"][aria-label*="réception" i]:hover,
    .nightcord-header-btn:hover {
        background-color: var(--background-modifier-hover, rgba(78, 80, 88, 0.3)) !important;
        color: var(--interactive-hover, oklab(0.89908 -0.00192902 -0.01033)) !important;
    }

    div[role="button"][aria-label="Boîte de réception"] svg,
    div[role="button"][aria-label="Inbox"] svg,
    div[role="button"][aria-label="Bandeja de entrada"] svg,
    div[role="button"][aria-label="Posteingang"] svg,
    div[role="button"][aria-label="Входящие"] svg,
    div[role="button"][aria-label*="Inbox" i] svg,
    div[role="button"][aria-label*="réception" i] svg,
    .nightcord-header-btn svg {
        width: 18px !important;
        height: 18px !important;
        min-width: 18px !important;
        min-height: 18px !important;
        max-width: 18px !important;
        max-height: 18px !important;
        display: block !important;
        margin: auto !important;
        flex-shrink: 0 !important;
    }
`;

function ensureHeaderStyles() {
    if (typeof document === "undefined") return;
    if (!document.getElementById(HEADER_STYLE_ID)) {
        const style = document.createElement("style");
        style.id = HEADER_STYLE_ID;
        style.textContent = HEADER_STYLE_CSS;
        document.head.appendChild(style);
    }
}
try { ensureHeaderStyles(); } catch {}

/** @internal Injected by HeaderBarAPI patch (do NOT call directly) */
export function _addHeaderBarButtons() {
    ensureHeaderStyles();
    return [
        <HeaderBarButtons key="vc-header-bar-buttons" />
    ];
}

/** @internal Injected by HeaderBarAPI patch (do NOT call directly) */
export function _addChannelToolbarButtons(children: any[]) {
    ensureHeaderStyles();
    children.push(<ChannelToolbarButtons key="vc-channel-toolbar-buttons" />);
}

