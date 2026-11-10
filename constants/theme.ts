import { Platform } from 'react-native';
export const colors = { ink:'#E9F4EF', muted:'#91A9A0', forest:'#0E1715', panel:'#15231F', panelAlt:'#1B302A', line:'#29463B', mint:'#A7F3D0', lime:'#C8F169', amber:'#F8C76D', danger:'#FF8F8F', white:'#FFFFFF', black:'#08100E' } as const;
export const lightColors = { ...colors, ink:'#10201A', muted:'#64766D', forest:'#F5FAF7', panel:'#FFFFFF', panelAlt:'#E8F3EE', line:'#D4E4DC' } as const;
export const spacing = { xs:6, sm:10, md:16, lg:24, xl:32 } as const;
export const shadow = Platform.select({ios:{shadowColor:'#000',shadowOpacity:0.12,shadowRadius:12,shadowOffset:{width:0,height:5}},android:{elevation:3},default:{}});

