import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { TrendingItem } from './dto/trending.dto';




@Injectable()
export class TrendingService {
	private readonly logger = new Logger(TrendingService.name);

	/**
	 * Scraping trends24.in para obtener tendencias reales de twitter.
	 * si includeCounts es true, también se intentará obtener la cantidad de tweets para cada tendencia, aunque esto no siempre está disponible.
	 */
	async getTrending(
		country = 'united-states',
		limit = 10,
		includeCounts = false,
	): Promise<TrendingItem[]> {
		const slug = country.toLowerCase().trim().replace(/\s+/g, '-');
		const url = `https://trends24.in/${slug}/`;
		try {
			const { data } = await axios.get(url, {
				headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)'}
			});
			const $ = cheerio.load(data);
			const tendencias: TrendingItem[] = [];

			$('ol.trend-card__list li').each((_, li) => {
				if (tendencias.length >= limit) return;
				const a = $(li).find('a.trend-link, .trend-name a').first();
				if (!a || a.length === 0) return;
				const nombre = a.text().trim();
				const href = a.attr('href') || '';

						let cantidad: string | null = null;
						if (includeCounts) {
							const countSpan = $(li).find('span.tweet-count').first();
							const dataCount = countSpan.attr('data-count') || countSpan.text();
							if (dataCount && dataCount !== '') {
								cantidad = String(dataCount).trim();
							} else {
								cantidad = null;
							}
						} else {
							// includeCounts false: set explicit null so JSON contains the field
							cantidad = null;
						}

				const link = href ? (href.startsWith('http') ? href : `https://twitter.com${href}`) : '';
				tendencias.push(new TrendingItem(nombre, link, cantidad));
			});

			return tendencias.slice(0, limit);
		} catch (err) {
			this.logger.warn(`Failed to fetch trends for ${slug}: ${err}`);
			return [];
		}
	}
}
