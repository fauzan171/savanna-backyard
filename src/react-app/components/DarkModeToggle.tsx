import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';

export function DarkModeToggle() {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		// Check localStorage or system preference
		const stored = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

		if (stored === 'dark' || (!stored && prefersDark)) {
			document.documentElement.classList.add('dark');
			setIsDark(true);
		}
	}, []);

	const toggle = () => {
		if (isDark) {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
			setIsDark(false);
		} else {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
			setIsDark(true);
		}
	};

	return (
		<Button variant="ghost" size="icon" onClick={toggle} aria-label="Ganti mode terang atau gelap">
			{isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
		</Button>
	);
}
