/*
 * Copyright (C) 2021 - present Juergen Zimmermann, Hochschule Karlsruhe
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { UseFilters, UseInterceptors } from '@nestjs/common';
import { Buch, BuchArt } from '../entity/buch.entity.js';
import { BuchReadService } from '../service/buch-read.service.js';
import { HttpExceptionFilter } from './http-exception.filter.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { getLogger } from '../../logger/logger.js';

export interface IdInput {
    readonly id: number;
}

export interface ImageInput {
    readonly imageName: string;
}

export interface BuchFilter {
    readonly titel?: string;
    readonly art?: BuchArt;
    readonly lieferbar?: boolean;
    readonly rating?: number;
}

@Resolver((_: any) => Buch)
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class BuchQueryResolver {
    readonly #service: BuchReadService;

    readonly #logger = getLogger(BuchQueryResolver.name);

    constructor(service: BuchReadService) {
        this.#service = service;
    }

    @Query('buch')
    async findById(@Args() idInput: IdInput) {
        const { id } = idInput;
        this.#logger.debug('findById: id=%d', id);

        const buch = await this.#service.findById({ id });

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'findById: buch=%s, titel=%o',
                buch.toString(),
                buch.titel,
            );
        }
        return buch;
    }

    @Query('buecher')
    async find(@Args('filter') filter: BuchFilter) {
        this.#logger.debug('find: Suchkriterium filter=%o', filter);

        const buecher = await this.#service.find(filter);

        this.#logger.debug('find: buecher=%o', buecher);
        return buecher;
    }

    @ResolveField('rabatt')
    rabatt(@Parent() buch: Buch, short: boolean | undefined) {
        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'rabatt: buch=%s, short=%s',
                buch.toString(),
                short,
            );
        }
        const rabatt = buch.rabatt ?? 0;
        const shortStr = short === undefined || short ? '%' : 'Prozent';
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        return `${(rabatt * 100).toFixed(2)} ${shortStr}`;
    }

   @Query('findImage')
   async findImage(@Args('imageInput') imageInput: ImageInput) {
        const { imageName } = imageInput;
        this.#logger.debug('Received ImageInput=%s', imageInput);
        this.#logger.debug('findImage: imageName=%s', imageName);

            // Call the new function in your service to load the image from the file system.
        const imageBuffer = await this.#service.findImageByName(imageName);
        return {
            imageName,
            image: imageBuffer.toString('base64'), // Assuming you want to return a base64-encoded image.
        };
    }

}
